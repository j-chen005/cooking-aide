// Load environment variables from .env file
import "dotenv/config";

import {
  WorkerOptions,
  cli,
  JobContext,
  voice,
} from "@livekit/agents";
import * as silero from "@livekit/agents-plugin-silero";
import * as livekitPlugin from "@livekit/agents-plugin-livekit";

/**
 * Voice Agent class that defines the agent's personality and behavior
 */
class CookingVoiceAgent extends voice.Agent {
  constructor() {
    super({
      instructions: `You are a helpful cooking assistant. You help users with cooking-related questions, 
      recipe suggestions, ingredient substitutions, and cooking tips. Be friendly, concise, and practical. 
      When giving cooking advice, be specific and helpful.`,
    });
  }
}

/**
 * Entry point for the voice agent job
 * This function is called when the agent joins a room
 */
async function entrypoint(ctx: JobContext) {
  // Connect agent to the room (automatically subscribes to audio only)
  await ctx.connect();

  // Set up the session with STT (Speech-to-Text), LLM, TTS (Text-to-Speech), VAD, and turn detection
  const session = new voice.AgentSession({
    // OpenAI Whisper for speech-to-text (using string identifier)
    stt: "openai/whisper-1",
    
    // OpenAI GPT-4o-mini for language model
    llm: "openai/gpt-4o-mini",
    
    // OpenAI TTS for text-to-speech
    tts: "openai/alloy",
    
    // Silero VAD for voice activity detection
    vad: await silero.VAD.load(),
    
    // LiveKit's end-of-turn detector for natural conversation flow
    turnDetection: new livekitPlugin.turnDetector.MultilingualModel(),
  });

  // Start the session with the agent
  await session.start({
    room: ctx.room,
    agent: new CookingVoiceAgent(),
    inputOptions: {
      // Add noise cancellation here if needed
      // noiseCancellation: somePlugin.noiseCancellation(),
    },
  });

  // Optionally send an initial greeting when the session starts
  await session.generateReply({
    instructions: "Hello! I'm your cooking assistant. How can I help you in the kitchen today?",
  });

  // Session lifecycle is managed automatically by LiveKit
}

// Run the agent
cli.runApp(
  new WorkerOptions({
    agent: "cooking-voice-agent",
    requestFunc: async (job) => {
      await entrypoint(job as unknown as JobContext);
    },
  })
);
