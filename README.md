# Cooking Aide

A real-time vision application using the Overshoot SDK to read visible text from camera input. Built with Node.js, Express, React, and TypeScript.

## Overview

This project uses the Overshoot RealtimeVision SDK to process camera input and extract visible text in real-time. Perfect for cooking assistance where you need to read recipe instructions, ingredient labels, or other text from your camera feed.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript, Vite
- **Vision SDK**: Overshoot SDK

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

1. Get your API key from [Overshoot](https://overshoot.ai)

2. Create a `.env` file in the `server/` directory:
```bash
cd server
cp .env.example .env
```

3. Update `server/.env` with your API key:
```
PORT=3001
OVERSHOOT_API_KEY=your-actual-api-key
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
3. Click "Start Vision" to begin camera processing
4. The service will read any visible text from your camera
5. Check the server console for recognized text output
6. Click "Stop Vision" when finished

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/vision/status` - Get vision service status
- `POST /api/vision/start` - Start the vision service
- `POST /api/vision/stop` - Stop the vision service

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

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues related to the Overshoot SDK, please check the [official documentation](https://docs.overshoot.ai).

## Author

Created with ❤️ for cooking enthusiasts
