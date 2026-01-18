import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env FIRST, before any other imports that might need env vars
dotenv.config({ path: join(__dirname, '..', '.env') });

// Now import modules that depend on environment variables
import express from 'express';
import cors from 'cors';
import chatgptRouter from './routes/chatgpt.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Cooking Aide API is running' });
});

// ChatGPT routes
app.use('/api/chatgpt', chatgptRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
