import { useState, useEffect, useRef } from 'react'
import { RealtimeVision } from '@overshoot/sdk'
import './App.css'

function App() {
  const [isRunning, setIsRunning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<string[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const visionRef = useRef<RealtimeVision | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Initialize vision instance when video file is selected
  useEffect(() => {
    if (!videoFile) return

    // Cleanup previous instance
    if (visionRef.current) {
      visionRef.current.stop().catch(console.error)
    }

    visionRef.current = new RealtimeVision({
      apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
      apiKey: import.meta.env.VITE_OVERSHOOT_API_KEY || 'your-api-key',
      prompt: 'You are a master chef who knows everything about any dish. Your job is to be an assitant to the chef cooking and give advice and instructions to the chef. If you have no suggestions or advice, just give reaffirmations that they are doing great. You can give suggestions like: You’re stirring well; slowing it down here will deepen flavor., Great sear—waiting 15 more seconds will improve the crust. In about 30 seconds, you’ll want to lower the heat.',
      source: { type: 'video', file: videoFile },
      onResult: (result) => {
        console.log('Vision result:', result.result)
        setResults(prev => [result.result, ...prev].slice(0, 10)) // Keep last 10 results
      }
    })

    return () => {
      // Cleanup on unmount
      if (visionRef.current) {
        visionRef.current.stop().catch(console.error)
      }
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [videoFile])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Clean up previous video URL
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
      
      // Create new video URL
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      setVideoFile(file)
      setError(null)
      setResults([])
      setIsRunning(false)
    }
  }

  const handleStart = async () => {
    setLoading(true)
    setError(null)
    try {
      if (visionRef.current) {
        await visionRef.current.start()
        setIsRunning(true)
        
        // Start playing the video
        if (videoRef.current) {
          videoRef.current.currentTime = 0 // Start from the beginning
          await videoRef.current.play()
        }
      }
    } catch (err) {
      console.error('Error starting vision:', err)
      
      // Provide helpful error messages
      let errorMessage = 'Failed to start vision service'
      if (err instanceof Error) {
        errorMessage = err.message
        
        // Check for common permission errors
        if (errorMessage.includes('Permission denied') || 
            errorMessage.includes('NotAllowedError') ||
            errorMessage.includes('permission')) {
          errorMessage = '🚫 Camera permission denied. Please:\n\n' +
            '1. Click the camera icon in your browser address bar\n' +
            '2. Select "Allow" for camera access\n' +
            '3. Refresh the page and try again\n\n' +
            'Make sure no other app is using your camera.'
        } else if (errorMessage.includes('NotFoundError') || 
                   errorMessage.includes('not found')) {
          errorMessage = '📷 No camera found. Please connect a camera and try again.'
        } else if (errorMessage.includes('NotReadableError') || 
                   errorMessage.includes('Could not start')) {
          errorMessage = '⚠️ Camera is already in use by another application. Close other apps using the camera and try again.'
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    setLoading(true)
    setError(null)
    try {
      if (visionRef.current) {
        await visionRef.current.stop()
        setIsRunning(false)
        
        // Pause the video
        if (videoRef.current) {
          videoRef.current.pause()
        }
      }
    } catch (err) {
      console.error('Error stopping vision:', err)
      setError(err instanceof Error ? err.message : 'Failed to stop vision service')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍳 Cooking Aide</h1>
        <p>Real-time Vision Text Recognition</p>
      </header>
      
      <main className="app-main">
        <div className="status-card">
          <h2>Select Video File</h2>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              style={{
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                width: '100%',
                cursor: 'pointer'
              }}
            />
            {videoFile && (
              <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
                📹 Selected: {videoFile.name}
              </p>
            )}
          </div>

          {videoUrl && (
            <div style={{ marginBottom: '20px' }}>
              <h3>Video Preview</h3>
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  backgroundColor: '#000'
                }}
              />
            </div>
          )}

          <h2>Vision Service Status</h2>
          <div className={`status-indicator ${isRunning ? 'running' : 'stopped'}`}>
            <span className="status-dot"></span>
            <span>{isRunning ? 'Running' : 'Stopped'}</span>
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="controls">
            <button
              onClick={handleStart}
              disabled={loading || isRunning || !videoFile}
              className="btn btn-start"
            >
              {loading ? 'Starting...' : 'Start Vision'}
            </button>
            <button
              onClick={handleStop}
              disabled={loading || !isRunning}
              className="btn btn-stop"
            >
              {loading ? 'Stopping...' : 'Stop Vision'}
            </button>
          </div>
        </div>

        <div className="results-card">
          <h3>Detected Text</h3>
          <div className="results-list">
            {results.length > 0 ? (
              results.map((result, index) => (
                <div key={index} className="result-item">
                  <span className="result-timestamp">{new Date().toLocaleTimeString()}</span>
                  <p>{result}</p>
                </div>
              ))
            ) : (
              <div className="results-empty">
                No detected text yet. Start the vision service to see results.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
