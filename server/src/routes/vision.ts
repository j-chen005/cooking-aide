import { Router, Request, Response } from 'express';
import { VisionService } from '../vision.js';

const router = Router();
let visionService: VisionService | null = null;

// Initialize vision service
const initializeVision = (): VisionService => {
  if (!visionService) {
    const apiKey = process.env.OVERSHOOT_API_KEY || 'your-api-key';
    visionService = new VisionService({
      apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
      apiKey: apiKey,
      prompt: 'Read any visible text',
    });
  }
  return visionService;
};

router.post('/start', async (req: Request, res: Response) => {
  try {
    const service = initializeVision();
    if (service.isServiceRunning()) {
      return res.status(400).json({ error: 'Vision service is already running' });
    }
    await service.start();
    res.json({ message: 'Vision service started successfully' });
  } catch (error) {
    console.error('Error starting vision service:', error);
    res.status(500).json({ 
      error: 'Failed to start vision service', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

router.post('/stop', async (req: Request, res: Response) => {
  try {
    const service = initializeVision();
    if (!service.isServiceRunning()) {
      return res.status(400).json({ error: 'Vision service is not running' });
    }
    await service.stop();
    res.json({ message: 'Vision service stopped successfully' });
  } catch (error) {
    console.error('Error stopping vision service:', error);
    res.status(500).json({ 
      error: 'Failed to stop vision service', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

router.get('/status', (req: Request, res: Response) => {
  try {
    const service = initializeVision();
    res.json({ 
      running: service.isServiceRunning() 
    });
  } catch (error) {
    console.error('Error getting vision status:', error);
    res.status(500).json({ 
      error: 'Failed to get vision status', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export { router as visionRouter };
