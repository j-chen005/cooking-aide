import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

interface VisionStatus {
  running: boolean
}

function App() {
  const [status, setStatus] = useState<VisionStatus>({ running: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkStatus = async () => {
    try {
      const response = await axios.get<VisionStatus>('/api/vision/status')
      setStatus(response.data)
      setError(null)
    } catch (err) {
      console.error('Error checking status:', err)
      setError('Failed to check vision status')
    }
  }

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 2000) // Check every 2 seconds
    return () => clearInterval(interval)
  }, [])

  const handleStart = async () => {
    setLoading(true)
    setError(null)
    try {
      await axios.post('/api/vision/start')
      await checkStatus()
    } catch (err) {
      console.error('Error starting vision:', err)
      setError(err instanceof Error ? err.message : 'Failed to start vision service')
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    setLoading(true)
    setError(null)
    try {
      await axios.post('/api/vision/stop')
      await checkStatus()
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
          <h2>Vision Service Status</h2>
          <div className={`status-indicator ${status.running ? 'running' : 'stopped'}`}>
            <span className="status-dot"></span>
            <span>{status.running ? 'Running' : 'Stopped'}</span>
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="controls">
            <button
              onClick={handleStart}
              disabled={loading || status.running}
              className="btn btn-start"
            >
              {loading ? 'Starting...' : 'Start Vision'}
            </button>
            <button
              onClick={handleStop}
              disabled={loading || !status.running}
              className="btn btn-stop"
            >
              {loading ? 'Stopping...' : 'Stop Vision'}
            </button>
          </div>
        </div>

        <div className="info-card">
          <h3>How to use</h3>
          <ol>
            <li>Click "Start Vision" to begin camera processing</li>
            <li>The service will read any visible text from your camera</li>
            <li>Check the server console for recognized text output</li>
            <li>Click "Stop Vision" when finished</li>
          </ol>
        </div>
      </main>
    </div>
  )
}

export default App
