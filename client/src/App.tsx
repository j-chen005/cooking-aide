import { useState, useEffect, useRef } from 'react'
import { RealtimeVision } from '@overshoot/sdk'
import './App.css'

interface AdviceItem {
  advice: string
  timestamp: string
}

function App() {
  const [isRunning, setIsRunning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<string[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [chatAdvice, setChatAdvice] = useState<AdviceItem[]>([])
  const [isGettingAdvice, setIsGettingAdvice] = useState(false)
  const visionRef = useRef<RealtimeVision | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const sessionId = useRef<string>(`session-${Date.now()}`)

  // Function to get ChatGPT advice
  const getChatAdvice = async (visionResult: string) => {
    setIsGettingAdvice(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/chatgpt/advice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visionResult,
          sessionId: sessionId.current
        }),
      })

      if (response.status === 429) {
        // Rate limited, skip silently
        return
      }

      if (!response.ok) {
        throw new Error('Failed to get advice from ChatGPT')
      }

      const data = await response.json()
      setChatAdvice(prev => [data, ...prev].slice(0, 10))
    } catch (err) {
      // Silently fail
    } finally {
      setIsGettingAdvice(false)
    }
  }

  useEffect(() => {
    if (!videoFile) return

    if (visionRef.current) {
      visionRef.current.stop().catch(() => {})
    }

    visionRef.current = new RealtimeVision({
      apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
      apiKey: import.meta.env.VITE_OVERSHOOT_API_KEY || 'your-api-key',
      prompt: "You are a master chef watching another amateur chef cook. Describe what you see, including the ingredients and the steps of the recipe. Focus more on the chef's actions over the background.",
      source: { type: 'video', file: videoFile },
      onResult: (result) => {
        setResults(prev => [result.result, ...prev].slice(0, 10))
        getChatAdvice(result.result)
      }
    })

    return () => {
      if (visionRef.current) {
        visionRef.current.stop().catch(() => {})
      }
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [videoFile])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
      
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      setVideoFile(file)
      setError(null)
      setResults([])
      setChatAdvice([])
      setIsRunning(false)
      sessionId.current = `session-${Date.now()}`
    }
  }

  const handleStart = async () => {
    setLoading(true)
    setError(null)
    try {
      if (visionRef.current) {
        await visionRef.current.start()
        setIsRunning(true)
        
        if (videoRef.current) {
          videoRef.current.currentTime = 0
          await videoRef.current.play()
        }
      }
    } catch (err) {
      let errorMessage = 'Failed to start vision service'
      if (err instanceof Error) {
        errorMessage = err.message
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
        
        if (videoRef.current) {
          videoRef.current.pause()
        }
      }
    } catch (err) {
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
          <h3>🤖 AI Cooking Advice</h3>
          {isGettingAdvice && (
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#f0f9ff', 
              borderRadius: '8px',
              marginBottom: '10px',
              color: '#0369a1'
            }}>
              💭 Getting advice from ChatGPT...
            </div>
          )}
          <div className="results-list">
            {chatAdvice.length > 0 ? (
              chatAdvice.map((item, index) => (
                <div key={index} className="result-item" style={{
                  backgroundColor: '#f0fdf4',
                  borderLeft: '4px solid #22c55e'
                }}>
                  <span className="result-timestamp">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                  <p style={{ fontWeight: 500, color: '#166534' }}>
                    {item.advice}
                  </p>
                </div>
              ))
            ) : (
              <div className="results-empty">
                No AI advice yet. Start the vision service to get real-time cooking tips!
              </div>
            )}
          </div>
        </div>

        <div className="results-card">
          <h3>👁️ Vision Detection</h3>
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
