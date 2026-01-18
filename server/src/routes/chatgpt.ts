import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

// Initialize OpenAI client lazily (only when needed)
let openai: OpenAI | null = null;

const getOpenAIClient = () => {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }
    
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

// Store conversation history for context
const conversationHistory = new Map<string, any[]>();
// Track last API call time per session
const lastCallTime = new Map<string, number>();

// Checklist item interface for consistent typing
interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ChecklistResponse {
  checklist: ChecklistItem[];
  title: string;
  timestamp: string;
}

router.post('/advice', async (req, res) => {
  try {
    const { visionResult, sessionId = 'default', recipeContext = '', mode = 'cooking' } = req.body;

    if (!visionResult) {
      return res.status(400).json({ error: 'Vision result is required' });
    }

    // Rate limit: Only call API once every 8 seconds to avoid OpenAI rate limits
    const now = Date.now();
    const lastCall = lastCallTime.get(sessionId) || 0;
    
    if (now - lastCall < 8000) {
      return res.status(429).json({ 
        error: 'Rate limited',
        details: 'Please wait before requesting more advice'
      });
    }
    lastCallTime.set(sessionId, now);

    // Get or initialize conversation history for this session
    if (!conversationHistory.has(sessionId)) {
      const systemPrompt = mode === 'cooking' 
        ? `You are a helpful cooking assistant providing real-time advice to someone cooking. 
You receive descriptions of what's happening in their kitchen from a vision AI. 
Your job is to:
1. Provide helpful, actionable cooking tips and advice
2. Warn them about potential mistakes or safety issues
3. Suggest next steps in the cooking process
4. Keep your responses concise (2-3 sentences max)
5. Be encouraging and supportive

Only respond if there's something meaningful to say. If the vision result shows nothing significant is happening, just acknowledge it briefly.`
        : `You are a helpful math tutor providing real-time guidance to a student working on math problems.
You receive descriptions of the current status of their in-progress math problem from a vision AI.
Your job is to:
1. Describe what you see in the math problem and its current state
2. Provide helpful hints and guidance without giving away the full solution
3. Identify any mistakes or correct steps they've taken
4. Suggest next logical steps in solving the problem
5. Keep your responses concise (2-3 sentences max)
6. Be encouraging and supportive

Focus on helping the student understand the process. If the vision result shows nothing significant, acknowledge it briefly.`;
      
      conversationHistory.set(sessionId, [
        {
          role: 'system',
          content: systemPrompt
        }
      ]);
    }

    const history = conversationHistory.get(sessionId)!;

    // Add the new vision result to the conversation
    const userMessage = mode === 'cooking' 
      ? `What I'm seeing in the kitchen: ${visionResult}`
      : `Current status of the math problem: ${visionResult}`;
    
    history.push({
      role: 'user',
      content: userMessage
    });

    // Keep only last 5 vision messages (10 messages total: 5 user + 5 assistant, plus system message)
    if (history.length > 11) {
      history.splice(1, history.length - 11);
    }

    // Get OpenAI client and call API
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-5-nano',
      messages: history,
      max_completion_tokens: 1000,
    });

    const advice = completion.choices[0]?.message?.content || 'No advice generated';

    // Add assistant's response to history
    history.push({
      role: 'assistant',
      content: advice
    });

    res.json({
      advice,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('ChatGPT API Error:', error instanceof Error ? error.message : error);
    res.status(500).json({ 
      error: 'Failed to get advice from ChatGPT',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate a checklist based on accumulated video descriptions
router.post('/checklist', async (req, res) => {
  try {
    const { videoDescriptions, recipeContext = '', mode = 'cooking' } = req.body;

    if (!videoDescriptions || !Array.isArray(videoDescriptions) || videoDescriptions.length === 0) {
      return res.status(400).json({ error: 'Video descriptions array is required' });
    }

    // Combine all video descriptions into a summary
    const combinedDescription = videoDescriptions.join('\n\n');

    const systemPrompt = mode === 'cooking'
      ? `You are a helpful cooking assistant. Based on the video descriptions provided, create a checklist of steps the person should follow or has been following.

IMPORTANT: You MUST respond with ONLY a valid JSON object in this exact format, no other text:
{
  "title": "Recipe/Dish Name",
  "checklist": [
    { "id": "1", "text": "Step description here", "completed": false },
    { "id": "2", "text": "Another step", "completed": false }
  ]
}

Rules:
- Generate 5-10 actionable checklist items based on what you observe
- Each item should be a clear, concise cooking step
- Mark items as "completed": true if the video shows that step was already done
- Mark items as "completed": false if the step still needs to be done or is in progress
- Order items logically (prep work first, then cooking steps)
- The title should describe what's being made based on the video`
      : `You are a helpful math tutor. Based on the video descriptions of the math problem, create a checklist of steps to solve it.

IMPORTANT: You MUST respond with ONLY a valid JSON object in this exact format, no other text:
{
  "title": "Problem Type/Topic",
  "checklist": [
    { "id": "1", "text": "Step description here", "completed": false },
    { "id": "2", "text": "Another step", "completed": false }
  ]
}

Rules:
- Generate 5-10 actionable checklist items for solving the problem
- Each item should be a clear step in the solution process
- Mark items as "completed": true if the video shows that step was already done
- Mark items as "completed": false if the step still needs to be done
- Order items in logical problem-solving sequence
- The title should describe the type of math problem being solved`;

    const userMessage = mode === 'cooking'
      ? `Here are the video descriptions of the cooking session:\n\n${combinedDescription}${recipeContext ? `\n\nThe user mentioned they are making: ${recipeContext}` : ''}`
      : `Here are the video descriptions of the math problem:\n\n${combinedDescription}${recipeContext ? `\n\nThe user mentioned the topic is: ${recipeContext}` : ''}`;

    // Get OpenAI client and call API
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse the JSON response
    let parsedResponse: { title: string; checklist: ChecklistItem[] };
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsedResponse = JSON.parse(jsonMatch[0]);
      
      // Validate the structure
      if (!parsedResponse.title || !Array.isArray(parsedResponse.checklist)) {
        throw new Error('Invalid response structure');
      }
      
      // Ensure each checklist item has the required fields
      parsedResponse.checklist = parsedResponse.checklist.map((item, index) => ({
        id: item.id || String(index + 1),
        text: item.text || 'Unknown step',
        completed: Boolean(item.completed)
      }));
    } catch (parseError) {
      console.error('Failed to parse checklist response:', responseText);
      // Return a fallback response
      parsedResponse = {
        title: mode === 'cooking' ? 'Cooking Steps' : 'Math Problem Steps',
        checklist: [
          { id: '1', text: 'Unable to generate checklist. Please try again.', completed: false }
        ]
      };
    }

    const response: ChecklistResponse = {
      ...parsedResponse,
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Checklist API Error:', error instanceof Error ? error.message : error);
    res.status(500).json({ 
      error: 'Failed to generate checklist',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update checklist completion status based on new video descriptions
router.post('/checklist-update', async (req, res) => {
  try {
    const { currentChecklist, videoDescriptions, mode = 'cooking' } = req.body;

    if (!currentChecklist || !Array.isArray(currentChecklist) || currentChecklist.length === 0) {
      return res.status(400).json({ error: 'Current checklist is required' });
    }

    if (!videoDescriptions || !Array.isArray(videoDescriptions) || videoDescriptions.length === 0) {
      return res.status(400).json({ error: 'Video descriptions are required' });
    }

    // Format the current checklist for the prompt
    const checklistText = currentChecklist.map((item: ChecklistItem, index: number) => 
      `${index + 1}. [${item.completed ? 'COMPLETED' : 'NOT COMPLETED'}] ${item.text}`
    ).join('\n');

    const combinedDescription = videoDescriptions.join('\n\n');

    const systemPrompt = mode === 'cooking'
      ? `You are a cooking progress tracker. You will be given a checklist of cooking steps and recent video descriptions of what's happening in the kitchen.

Your job is to determine which steps have been completed based on what you observe in the video descriptions.

IMPORTANT RULES:
1. You MUST respond with ONLY a JSON array of item IDs that should now be marked as completed
2. ONLY include IDs for items that the video shows have been done
3. If an item was already marked COMPLETED, do NOT include it (we only need newly completed items)
4. If no new items are completed, return an empty array: []
5. Be conservative - only mark as complete if you're confident the step was done

Example response: ["2", "3"] or []`
      : `You are a math problem progress tracker. You will be given a checklist of problem-solving steps and recent video descriptions of the student's work.

Your job is to determine which steps have been completed based on what you observe in the video descriptions.

IMPORTANT RULES:
1. You MUST respond with ONLY a JSON array of item IDs that should now be marked as completed
2. ONLY include IDs for items that the video shows have been done
3. If an item was already marked COMPLETED, do NOT include it (we only need newly completed items)
4. If no new items are completed, return an empty array: []
5. Be conservative - only mark as complete if you're confident the step was done

Example response: ["2", "3"] or []`;

    const userMessage = `Current checklist:
${checklistText}

Recent video observations:
${combinedDescription}

Which item IDs (if any) should now be marked as completed based on what you see?`;

    // Get OpenAI client and call API
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content || '[]';
    
    // Parse the JSON response
    let completedIds: string[];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) {
        completedIds = [];
      } else {
        completedIds = JSON.parse(jsonMatch[0]);
        // Ensure it's an array of strings
        if (!Array.isArray(completedIds)) {
          completedIds = [];
        }
        completedIds = completedIds.map(id => String(id));
      }
    } catch (parseError) {
      console.error('Failed to parse checklist update response:', responseText);
      completedIds = [];
    }

    res.json({
      completedIds,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Checklist Update API Error:', error instanceof Error ? error.message : error);
    res.status(500).json({ 
      error: 'Failed to update checklist',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
