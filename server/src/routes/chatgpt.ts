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

export default router;
