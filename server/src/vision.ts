import { RealtimeVision } from '@overshoot/sdk';

export interface VisionConfig {
  apiUrl: string;
  apiKey: string;
  prompt: string;
}

export interface VisionResult {
  result: string;
}

export class VisionService {
  private vision: RealtimeVision | null = null;
  private isRunning: boolean = false;

  constructor(config: VisionConfig) {
    this.vision = new RealtimeVision({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      prompt: config.prompt,
      onResult: (result: VisionResult) => {
        console.log('Vision result:', result.result);
      }
    });
  }

  async start(): Promise<void> {
    if (!this.vision) {
      throw new Error('Vision service not initialized');
    }
    if (this.isRunning) {
      throw new Error('Vision service is already running');
    }
    await this.vision.start();
    this.isRunning = true;
    console.log('Vision service started');
  }

  async stop(): Promise<void> {
    if (!this.vision) {
      throw new Error('Vision service not initialized');
    }
    if (!this.isRunning) {
      throw new Error('Vision service is not running');
    }
    await this.vision.stop();
    this.isRunning = false;
    console.log('Vision service stopped');
  }

  isServiceRunning(): boolean {
    return this.isRunning;
  }
}
