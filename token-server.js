// Simple token server for generating LiveKit access tokens
// Run this with: node token-server.js
// Then visit http://localhost:3000/token?room=my-room

import { AccessToken } from 'livekit-server-sdk';
import express from 'express';

const app = express();
const port = 3000;

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

app.get('/token', (req, res) => {
  const { room, identity } = req.query;

  if (!room) {
    return res.status(400).json({ error: 'Room parameter is required' });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ 
      error: 'LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set in .env file' 
    });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: identity || `user-${Date.now()}`,
  });

  at.addGrant({
    room: room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  const token = at.toJwt();

  res.json({
    token: token,
    url: process.env.LIVEKIT_URL || 'wss://your-livekit-server.livekit.cloud',
    room: room,
  });
});

app.listen(port, () => {
  console.log(`Token server running at http://localhost:${port}`);
  console.log(`Get a token: http://localhost:${port}/token?room=my-room`);
});
