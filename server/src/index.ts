import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { visionRouter } from './routes/vision.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/vision', visionRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Cooking Aide API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
