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
    const { visionResult, sessionId = 'default', recipeContext = '' } = req.body;

    if (!visionResult) {
      return res.status(400).json({ error: 'Vision result is required' });
    }

    // Rate limit: Only call API once every 5 seconds
    const now = Date.now();
    const lastCall = lastCallTime.get(sessionId) || 0;
    if (now - lastCall < 5000) {
      return res.status(429).json({ 
        error: 'Rate limited',
        details: 'Please wait before requesting more advice'
      });
    }
    lastCallTime.set(sessionId, now);

    // Get or initialize conversation history for this session
    if (!conversationHistory.has(sessionId)) {
      conversationHistory.set(sessionId, [
        {
          role: 'system',
          content: `You are a helpful cooking assistant providing real-time advice to someone cooking. 
You receive descriptions of what's happening in their kitchen from a vision AI. 
Your job is to:
1. Provide helpful, actionable cooking tips and advice
2. Warn them about potential mistakes or safety issues
3. Suggest next steps in the cooking process
4. Keep your responses concise (2-3 sentences max)
5. Be encouraging and supportive

Only respond if there's something meaningful to say. If the vision result shows nothing significant is happening, just acknowledge it briefly.`
        }
      ]);
    }

    const history = conversationHistory.get(sessionId)!;

    // Add the new vision result to the conversation
    history.push({
      role: 'user',
      content: `What I'm seeing in the kitchen: ${visionResult}`
    });

    // Keep only last 5 vision messages (10 messages total: 5 user + 5 assistant, plus system message)
    if (history.length > 11) {
      history.splice(1, history.length - 11);
    }

    // Get OpenAI client and call API
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: history,
      temperature: 0.7,
      max_tokens: 150,
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
    res.status(500).json({ 
      error: 'Failed to get advice from ChatGPT',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
