# InstructorAI

A real-time vision AI assistant using the Overshoot SDK for vision processing and OpenAI GPT for intelligent guidance. Supports both cooking assistance and math tutoring modes with video file or live camera input.

## Overview

InstructorAI is a multi-purpose AI assistant that provides real-time guidance in two modes:

- **🍳 Cooking Mode**: Get live cooking advice, tips, and safety reminders while preparing food
- **📚 School Mode**: Receive math tutoring guidance and problem-solving help in real-time

The app uses Overshoot's RealtimeVision SDK to process video input (from files or live camera) and analyzes what's happening in real-time. Combined with OpenAI GPT, it provides contextual advice and feedback based on what the vision AI observes.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript, Vite
- **Vision SDK**: Overshoot RealtimeVision SDK
- **AI**: OpenAI GPT-5-Nano for intelligent advice and guidance

## Project Structure

```
cooking-aide/
├── server/                 # Backend API
│   ├── src/
│   │   ├── index.ts       # Express server entry point
│   │   └── routes/
│   │       └── chatgpt.ts # ChatGPT API routes
│   ├── package.json
│   └── tsconfig.json
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── App.tsx        # Main React component
│   │   ├── main.tsx       # React entry point
│   │   ├── App.css        # App styles
│   │   └── index.css      # Global styles
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── package.json           # Root package.json with scripts
└── README.md
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A valid Overshoot API key
- An OpenAI API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cooking-aide.git
cd cooking-aide
```

2. Install all dependencies:
```bash
npm run install:all
```

Or install manually:
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

## Configuration

### Client Configuration

1. Get your API key from [Overshoot Platform](https://overshoot.ai)

2. Create a `.env` file in the `client/` directory:
```bash
cd client
cat > .env << EOF
VITE_OVERSHOOT_API_KEY=your-actual-api-key
VITE_API_URL=http://localhost:3001
EOF
```

Or manually create `client/.env`:
```
VITE_OVERSHOOT_API_KEY=your-actual-api-key
VITE_API_URL=http://localhost:3001
```

**Note:** 
- The Overshoot SDK runs in the browser (client-side) to access your camera
- `VITE_API_URL` should point to your backend server (defaults to `http://localhost:3001` if not set)
- In production, set `VITE_API_URL` to your deployed backend URL

### Server Configuration

1. Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)

2. Create a `.env` file in the `server/` directory:
```bash
cd server
cat > .env << EOF
PORT=3001
OPENAI_API_KEY=your-openai-api-key
EOF
```

Or manually create `server/.env`:
```
PORT=3001
OPENAI_API_KEY=your-openai-api-key
```

## Development

### Run both frontend and backend:
```bash
npm run dev
```

### Run separately:

**Backend only:**
```bash
npm run dev:server
# or
cd server && npm run dev
```

**Frontend only:**
```bash
npm run dev:client
# or
cd client && npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173 (Vite default)
- Backend API: http://localhost:3001

## Build

Build both frontend and backend:
```bash
npm run build
```

Build separately:
```bash
npm run build:server  # Builds server to server/dist/
npm run build:client  # Builds client to client/dist/
```

## Production

Start the production server:
```bash
npm start
```

This will start the compiled backend server. Make sure to build both projects first.

## Usage

1. Start the development servers: `npm run dev`
2. Open http://localhost:5173 in your browser
3. **Select Mode**: Choose between Cooking 🍳 or School 📚 mode
4. **Select Input Source**: Choose between Video File 📹 or Live Camera 📷
5. **Optional Context**: Enter what you're cooking or studying (helps the AI provide better advice)
6. **Start Processing**:
   - For **Video File**: Upload a video file, then click "Start Vision"
   - For **Live Camera**: Click "Start Vision" to enable your camera
7. The vision AI will analyze what's happening in real-time
8. ChatGPT will provide contextual advice and feedback based on the analysis
9. View AI advice and vision detection results in separate panels
10. Click "Stop Vision" when finished

## Features

### 🍳 Cooking Mode
- **Real-time Cooking Advice**: Get tips, warnings, and suggestions from GPT while cooking
- **Vision Detection**: See what the vision AI observes in your cooking process
- **Safety Reminders**: Receive alerts about potential mistakes or safety issues
- **Context-Aware**: Maintains conversation history for contextual guidance

### 📚 School Mode (Math Tutoring)
- **Problem-Solving Guidance**: Get hints and step-by-step guidance without full solutions
- **Mistake Identification**: AI identifies errors and provides corrective feedback
- **Progress Tracking**: Recognizes current problem state and suggests next steps
- **Encouraging Support**: Positive reinforcement throughout the learning process

### 🎥 Input Sources
- **Video File**: Upload and analyze pre-recorded video files
- **Live Camera**: Real-time analysis using your device's camera
- **Flexible Switching**: Switch between modes and input sources anytime

### 🤖 AI Features
- **Contextual Understanding**: AI maintains conversation history for relevant advice
- **Rate Limiting**: Built-in rate limiting to avoid API overuse
- **Dual-Panel Display**: Separate views for AI advice and raw vision detection
- **Session Management**: Each session maintains its own context

## API Endpoints

### Health Check
- `GET /api/health` - Check if the API is running
  - Response: `{ status: 'ok', message: 'Cooking Aide API is running' }`

### ChatGPT Advice
- `POST /api/chatgpt/advice` - Get AI advice based on vision results
  - Request body:
    ```json
    {
      "visionResult": "string (required) - What the vision AI sees",
      "sessionId": "string (optional) - Session ID for conversation history",
      "recipeContext": "string (optional) - What you're cooking/studying",
      "mode": "cooking | school (optional, defaults to cooking)"
    }
    ```
  - Success Response (200):
    ```json
    {
      "advice": "string - AI-generated advice",
      "timestamp": "string - ISO timestamp"
    }
    ```
  - Rate Limit Response (429):
    ```json
    {
      "error": "Rate limited",
      "details": "Please wait before requesting more advice"
    }
    ```

**Note:** Rate limiting is set to 8 seconds between requests per session to avoid OpenAI API limits.

## Scripts

### Root scripts:
- `npm run dev` - Run both frontend and backend in development mode
- `npm run build` - Build both projects
- `npm run install:all` - Install all dependencies
- `npm start` - Run production server

### Server scripts:
- `npm run dev` - Run server in development mode (with hot reload)
- `npm run build` - Build server TypeScript to JavaScript
- `npm run start` - Run compiled server

### Client scripts:
- `npm run dev` - Run client in development mode
- `npm run build` - Build client for production
- `npm run preview` - Preview production build

## Technology Details

### Vision Processing
- Runs entirely in the browser using Overshoot SDK
- Supports both video file analysis and live camera feed
- Configurable prompts based on mode (cooking vs school)
- Real-time result streaming

### AI Integration
- Uses OpenAI GPT-5-Nano model
- Maintains conversation history (up to 5 exchanges)
- Mode-specific system prompts for optimal guidance
- Concise responses (2-3 sentences) for real-time use

### Rate Limiting
- Client-side: Debouncing with 8-second intervals
- Server-side: Enforced 8-second rate limit per session
- Visual indicators for rate limit status

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

- For Overshoot SDK issues: [Overshoot Documentation](https://docs.overshoot.ai)
- For OpenAI API issues: [OpenAI Documentation](https://platform.openai.com/docs)

## License

MIT

## Author

Created with ❤️ for learners and cooking enthusiasts
