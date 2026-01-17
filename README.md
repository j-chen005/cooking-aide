# Cooking Aide

A real-time vision application using the Overshoot SDK to read visible text from camera input.

## Overview

This project uses the Overshoot RealtimeVision SDK to process camera input and extract visible text in real-time. Perfect for cooking assistance where you need to read recipe instructions, ingredient labels, or other text from your camera feed.

## Features

- Real-time text recognition from camera input
- Uses Overshoot SDK for vision processing
- Simple and straightforward implementation

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A valid Overshoot API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cooking-aide.git
cd cooking-aide
```

2. Install dependencies:
```bash
npm install
```

## Configuration

1. Get your API key from [Overshoot](https://overshoot.ai)

2. Update `vision.js` with your API key:
```javascript
const vision = new RealtimeVision({
  apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
  apiKey: 'your-api-key', // Replace with your actual API key
  prompt: 'Read any visible text',
  onResult: (result) => {
    console.log(result.result)
  }
})
```

## Usage

Run the application:
```bash
node vision.js
```

Or if using ES modules:
```bash
node --experimental-modules vision.js
```

The application will:
1. Start the camera
2. Begin processing frames for visible text
3. Log results to the console
4. Stop when `vision.stop()` is called

## Project Structure

```
cooking-aide/
├── vision.js          # Main application file
├── package.json       # Project dependencies
├── README.md          # This file
└── .gitignore         # Git ignore rules
```

## API Reference

This project uses the [Overshoot SDK](https://docs.overshoot.ai) for real-time vision processing.

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues related to the Overshoot SDK, please check the [official documentation](https://docs.overshoot.ai).

## Author

Created with ❤️ for cooking enthusiasts
