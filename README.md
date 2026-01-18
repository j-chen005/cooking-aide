# Cooking Aide

A real-time vision application using the Overshoot SDK to read visible text from camera input. Built with Node.js, Express, React, and TypeScript.

## Overview

This project uses the Overshoot RealtimeVision SDK to process video input and analyze what's happening in real-time. Combined with ChatGPT, it provides live cooking advice and feedback based on what the vision AI sees. Perfect for cooking assistance where you need real-time guidance, tips, and safety reminders while preparing food.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript, Vite
- **Vision SDK**: Overshoot SDK
- **AI**: OpenAI GPT-4 for real-time cooking advice

## Project Structure

```
cooking-aide/
├── server/                 # Backend API
│   ├── src/
│   │   ├── index.ts       # Express server entry point
│   │   ├── vision.ts      # Vision service wrapper
│   │   └── routes/
│   │       └── vision.ts  # Vision API routes
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
- Frontend: http://localhost:3000
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
2. Open http://localhost:3000 in your browser
3. Select a cooking video file to analyze
4. Click "Start Vision" to begin video processing
5. The vision AI will analyze what's happening in the video
6. ChatGPT will provide real-time cooking advice and feedback based on the analysis
7. View AI cooking advice and vision detection results in separate panels
8. Click "Stop Vision" when finished

**Features:**
- 🤖 **AI Cooking Advice**: Get real-time tips, warnings, and suggestions from ChatGPT
- 👁️ **Vision Detection**: See what the vision AI is observing in your cooking video
- 💡 **Context-Aware**: ChatGPT maintains conversation history for contextual advice

## API Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/chatgpt/advice` - Get cooking advice from ChatGPT based on vision results
  - Request body: `{ visionResult: string, sessionId?: string }`
  - Response: `{ advice: string, timestamp: string }`

**Note:** The vision processing runs entirely in the browser using the Overshoot SDK, so server-side vision endpoints are not required.

## Scripts

### Root scripts:
- `npm run dev` - Run both frontend and backend in development mode
- `npm run build` - Build both projects
- `npm run install:all` - Install all dependencies

### Server scripts:
- `npm run dev:server` - Run server in development mode (with hot reload)
- `npm run build:server` - Build server TypeScript to JavaScript
- `npm run start` - Run compiled server

### Client scripts:
- `npm run dev:client` - Run client in development mode
- `npm run build:client` - Build client for production
- `npm run preview` - Preview production build

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues related to the Overshoot SDK, please check the [official documentation](https://docs.overshoot.ai).

## Author

Created with ❤️ for cooking enthusiasts
