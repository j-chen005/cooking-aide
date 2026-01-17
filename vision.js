import { RealtimeVision } from '@overshoot/sdk'
 
const vision = new RealtimeVision({
  apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
  apiKey: 'your-api-key',
  prompt: 'Read any visible text',
  onResult: (result) => {
    console.log(result.result)
  }
})
 
await vision.start()   // starts the camera and begins processing
await vision.stop()    // stops everything
