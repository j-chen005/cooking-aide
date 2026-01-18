import { useState, useEffect, useRef } from 'react'
import { RealtimeVision } from '@overshoot/sdk'
import './App.css'

interface AdviceItem {
  advice: string
  timestamp: string
}

interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

interface ChecklistData {
  title: string
  checklist: ChecklistItem[]
  timestamp: string
}

type TabType = 'video' | 'camera'
type ModeType = 'cooking' | 'school'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('video')
  const [mode, setMode] = useState<ModeType>('cooking')
  const [isRunning, setIsRunning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<string[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [chatAdvice, setChatAdvice] = useState<AdviceItem[]>([])
  const [isGettingAdvice, setIsGettingAdvice] = useState(false)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [recipeDescription, setRecipeDescription] = useState<string>('')
  const [checklistData, setChecklistData] = useState<ChecklistData | null>(null)
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false)
  const visionRef = useRef<RealtimeVision | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null)
  const sessionId = useRef<string>(`session-${Date.now()}`)
  const lastAdviceCallTime = useRef<number>(0)
  const adviceTimeoutRef = useRef<number | null>(null)
  const checklistTimeoutRef = useRef<number | null>(null)
  const checklistPollIntervalRef = useRef<number | null>(null)
  const collectedDescriptions = useRef<string[]>([])
  const isPlayingAudioRef = useRef<boolean>(false)

  // Function to get the prompt based on the current mode
  const getPromptForMode = () => {
    if (mode === 'cooking') {
      return "You are a master chef watching another chef cook. Describe what you see, including the ingredients and the steps of the recipe. Focus more on the chef's actions over the background."
    } else {
      return "You are a math tutor observing a student working on a math problem. Describe the current status of the in-progress math problem you see. Focus on what equations, numbers, or work is being shown."
    }
  }

  // Function to get ChatGPT advice with debouncing
  const getChatAdvice = (visionResult: string) => {
    // Clear any pending timeout
    if (adviceTimeoutRef.current) {
      clearTimeout(adviceTimeoutRef.current)
    }

    // Check if we're within the rate limit window (8 seconds to match server)
    const now = Date.now()
    const timeSinceLastCall = now - lastAdviceCallTime.current
    
    if (timeSinceLastCall < 8000) {
      // Schedule the call for after the rate limit window
      const delay = 8000 - timeSinceLastCall
      setIsRateLimited(true)
      
      adviceTimeoutRef.current = setTimeout(() => {
        makeAdviceRequest(visionResult)
        setIsRateLimited(false)
      }, delay)
      return
    }

    // Update timestamp BEFORE making the request to prevent race conditions
    lastAdviceCallTime.current = Date.now()
    
    // Otherwise call immediately
    makeAdviceRequest(visionResult)
  }

  const makeAdviceRequest = async (visionResult: string) => {
    setIsGettingAdvice(true)
    setIsRateLimited(false)
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/chatgpt/advice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visionResult,
          sessionId: sessionId.current,
          recipeContext: recipeDescription,
          mode: mode
        }),
      })

      if (response.status === 429) {
        setIsRateLimited(true)
        return
      }

      if (!response.ok) {
        return
      }

      const data = await response.json()
      setChatAdvice(prev => [data, ...prev].slice(0, 10))
      setIsRateLimited(false)
    } catch (err) {
      // Silently fail for network errors
    } finally {
      setIsGettingAdvice(false)
    }
  }

  // Function to speak out-of-order warning using OpenAI TTS
  const speakOutOfOrderWarning = async (skippedSteps: string[]) => {
    // Don't play if already playing
    if (isPlayingAudioRef.current) return
    
    isPlayingAudioRef.current = true
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const skippedList = skippedSteps.length === 1 
        ? skippedSteps[0]
        : `${skippedSteps.slice(0, -1).join(', ')} and ${skippedSteps[skippedSteps.length - 1]}`
      
      const message = `Hey, you missed: ${skippedList}. Would you like to do ${skippedSteps.length === 1 ? 'it' : 'them'}?`
      
      const response = await fetch(`${apiUrl}/api/chatgpt/speak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: message }),
      })

      if (!response.ok) {
        console.error('TTS request failed:', response.statusText)
        return
      }

      // Get the audio blob and play it
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        isPlayingAudioRef.current = false
      }
      
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl)
        isPlayingAudioRef.current = false
      }
      
      await audio.play()
    } catch (err) {
      console.error('Failed to play out-of-order warning:', err)
      isPlayingAudioRef.current = false
    }
  }

  // Function to check if completing a step would be out of order
  const checkOutOfOrder = (checklist: ChecklistItem[], completingId: string): { isOutOfOrder: boolean, skippedSteps: string[] } => {
    const completingIndex = checklist.findIndex(item => item.id === completingId)
    if (completingIndex <= 0) return { isOutOfOrder: false, skippedSteps: [] }
    
    // Check if any previous items are not completed
    const skippedSteps: string[] = []
    for (let i = 0; i < completingIndex; i++) {
      if (!checklist[i].completed) {
        skippedSteps.push(checklist[i].text)
      }
    }
    
    return { isOutOfOrder: skippedSteps.length > 0, skippedSteps }
  }

  // Function to generate checklist from accumulated descriptions
  const generateChecklist = async () => {
    if (collectedDescriptions.current.length === 0) return

    setIsGeneratingChecklist(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/chatgpt/checklist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoDescriptions: collectedDescriptions.current,
          recipeContext: recipeDescription,
          mode: mode
        }),
      })

      if (!response.ok) {
        console.error('Checklist generation failed:', response.statusText)
        return
      }

      const data: ChecklistData = await response.json()
      setChecklistData(data)
    } catch (err) {
      console.error('Failed to generate checklist:', err)
    } finally {
      setIsGeneratingChecklist(false)
    }
  }

  // Function to poll for checklist updates every 5 seconds
  const pollChecklistUpdate = async () => {
    // Don't poll if there's no checklist or no descriptions
    if (!checklistData || collectedDescriptions.current.length === 0) return

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/chatgpt/checklist-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentChecklist: checklistData.checklist,
          videoDescriptions: collectedDescriptions.current,
          mode: mode
        }),
      })

      if (!response.ok) {
        console.error('Checklist update failed:', response.statusText)
        return
      }

      const data: { completedIds: string[], newItems: ChecklistItem[], timestamp: string } = await response.json()
      
      const hasCompletedItems = data.completedIds && data.completedIds.length > 0
      const hasNewItems = data.newItems && data.newItems.length > 0
      
      // Check for out-of-order completions before updating
      if (hasCompletedItems) {
        for (const completingId of data.completedIds) {
          const item = checklistData.checklist.find(i => i.id === completingId)
          if (item && !item.completed) {
            const { isOutOfOrder, skippedSteps } = checkOutOfOrder(checklistData.checklist, completingId)
            if (isOutOfOrder) {
              // Speak the warning (will only play if not already playing)
              speakOutOfOrderWarning(skippedSteps)
              break // Only warn about the first out-of-order item to avoid overwhelming
            }
          }
        }
      }
      
      // Update the checklist with completed items and new items
      if (hasCompletedItems || hasNewItems) {
        setChecklistData(prev => {
          if (!prev) return prev
          
          // Update completed status for existing items
          let updatedChecklist = prev.checklist.map(item => ({
            ...item,
            // Keep completed if already completed, or mark as completed if in the new list
            completed: item.completed || (data.completedIds?.includes(item.id) ?? false)
          }))
          
          // Add new items to the checklist
          if (hasNewItems) {
            updatedChecklist = [...updatedChecklist, ...data.newItems]
          }
          
          return {
            ...prev,
            checklist: updatedChecklist
          }
        })
      }
    } catch (err) {
      console.error('Failed to poll checklist update:', err)
    }
  }

  // Start/stop polling when checklist is available and running
  useEffect(() => {
    if (isRunning && checklistData) {
      // Start polling every 5 seconds
      checklistPollIntervalRef.current = setInterval(() => {
        pollChecklistUpdate()
      }, 5000)
    } else {
      // Stop polling
      if (checklistPollIntervalRef.current) {
        clearInterval(checklistPollIntervalRef.current)
        checklistPollIntervalRef.current = null
      }
    }

    return () => {
      if (checklistPollIntervalRef.current) {
        clearInterval(checklistPollIntervalRef.current)
        checklistPollIntervalRef.current = null
      }
    }
  }, [isRunning, checklistData, mode])

  // Function to toggle checklist item completion
  const toggleChecklistItem = (itemId: string) => {
    if (!checklistData) return
    
    const item = checklistData.checklist.find(i => i.id === itemId)
    if (!item) return
    
    // If we're completing (not unchecking) an item, check for out-of-order
    if (!item.completed) {
      const { isOutOfOrder, skippedSteps } = checkOutOfOrder(checklistData.checklist, itemId)
      if (isOutOfOrder) {
        speakOutOfOrderWarning(skippedSteps)
      }
    }
    
    setChecklistData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        checklist: prev.checklist.map(i =>
          i.id === itemId ? { ...i, completed: !i.completed } : i
        )
      }
    })
  }

  // Video file effect
  useEffect(() => {
    if (activeTab !== 'video' || !videoFile) return

    if (visionRef.current) {
      visionRef.current.stop().catch(() => {})
    }

    visionRef.current = new RealtimeVision({
      apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
      apiKey: import.meta.env.VITE_OVERSHOOT_API_KEY || 'your-api-key',
      prompt: getPromptForMode(),
      source: { type: 'video', file: videoFile },
      onResult: (result) => {
        setResults(prev => [result.result, ...prev].slice(0, 10))
        getChatAdvice(result.result)
        
        // Collect descriptions for checklist generation
        collectedDescriptions.current = [...collectedDescriptions.current, result.result].slice(-10)
        
        // Start 10-second timer for checklist generation on first result
        if (!checklistTimeoutRef.current && !checklistData) {
          checklistTimeoutRef.current = setTimeout(() => {
            generateChecklist()
          }, 10000)
        }
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
  }, [videoFile, activeTab, mode])

  // Camera effect
  useEffect(() => {
    if (activeTab !== 'camera') return

    if (visionRef.current) {
      visionRef.current.stop().catch(() => {})
    }

    visionRef.current = new RealtimeVision({
      apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
      apiKey: import.meta.env.VITE_OVERSHOOT_API_KEY || 'your-api-key',
      prompt: getPromptForMode(),
      source: { type: 'camera', cameraFacing: 'user' },
      onResult: (result) => {
        setResults(prev => [result.result, ...prev].slice(0, 10))
        getChatAdvice(result.result)
        
        // Collect descriptions for checklist generation
        collectedDescriptions.current = [...collectedDescriptions.current, result.result].slice(-10)
        
        // Start 10-second timer for checklist generation on first result
        if (!checklistTimeoutRef.current && !checklistData) {
          checklistTimeoutRef.current = setTimeout(() => {
            generateChecklist()
          }, 10000)
        }
      }
    })

    return () => {
      if (visionRef.current) {
        visionRef.current.stop().catch(() => {})
      }
    }
  }, [activeTab, mode])

  // Handle mode change
  const handleModeChange = (newMode: ModeType) => {
    if (isRunning) {
      handleStop()
    }
    // Clear pending advice timeout
    if (adviceTimeoutRef.current) {
      clearTimeout(adviceTimeoutRef.current)
      adviceTimeoutRef.current = null
    }
    // Clear checklist timeout
    if (checklistTimeoutRef.current) {
      clearTimeout(checklistTimeoutRef.current)
      checklistTimeoutRef.current = null
    }
    // Clear checklist poll interval
    if (checklistPollIntervalRef.current) {
      clearInterval(checklistPollIntervalRef.current)
      checklistPollIntervalRef.current = null
    }
    setMode(newMode)
    setResults([])
    setChatAdvice([])
    setChecklistData(null)
    setError(null)
    setIsRateLimited(false)
    setIsGettingAdvice(false)
    setIsGeneratingChecklist(false)
    lastAdviceCallTime.current = 0
    collectedDescriptions.current = []
    sessionId.current = `session-${Date.now()}`
  }

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    if (isRunning) {
      handleStop()
    }
    // Clear pending advice timeout
    if (adviceTimeoutRef.current) {
      clearTimeout(adviceTimeoutRef.current)
      adviceTimeoutRef.current = null
    }
    // Clear checklist timeout
    if (checklistTimeoutRef.current) {
      clearTimeout(checklistTimeoutRef.current)
      checklistTimeoutRef.current = null
    }
    // Clear checklist poll interval
    if (checklistPollIntervalRef.current) {
      clearInterval(checklistPollIntervalRef.current)
      checklistPollIntervalRef.current = null
    }
    setActiveTab(tab)
    setResults([])
    setChatAdvice([])
    setChecklistData(null)
    setError(null)
    setIsRateLimited(false)
    setIsGettingAdvice(false)
    setIsGeneratingChecklist(false)
    lastAdviceCallTime.current = 0
    collectedDescriptions.current = []
    sessionId.current = `session-${Date.now()}`
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (adviceTimeoutRef.current) {
        clearTimeout(adviceTimeoutRef.current)
      }
      if (checklistTimeoutRef.current) {
        clearTimeout(checklistTimeoutRef.current)
      }
      if (checklistPollIntervalRef.current) {
        clearInterval(checklistPollIntervalRef.current)
      }
    }
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
      // Clear checklist timeout
      if (checklistTimeoutRef.current) {
        clearTimeout(checklistTimeoutRef.current)
        checklistTimeoutRef.current = null
      }
      // Clear checklist poll interval
      if (checklistPollIntervalRef.current) {
        clearInterval(checklistPollIntervalRef.current)
        checklistPollIntervalRef.current = null
      }
      
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      setVideoFile(file)
      setError(null)
      setResults([])
      setChatAdvice([])
      setChecklistData(null)
      setIsRunning(false)
      setIsGeneratingChecklist(false)
      collectedDescriptions.current = []
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
        
        if (activeTab === 'video' && videoRef.current) {
          videoRef.current.currentTime = 0
          await videoRef.current.play()
        } else if (activeTab === 'camera' && cameraVideoRef.current) {
          // Get camera stream and display it
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          cameraVideoRef.current.srcObject = stream
          await cameraVideoRef.current.play()
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
        
        if (activeTab === 'video' && videoRef.current) {
          videoRef.current.pause()
        } else if (activeTab === 'camera' && cameraVideoRef.current) {
          // Stop camera stream
          const stream = cameraVideoRef.current.srcObject as MediaStream
          if (stream) {
            stream.getTracks().forEach(track => track.stop())
          }
          cameraVideoRef.current.srcObject = null
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
        <h1>🤖 InstructorAI</h1>
        <p>Real-time Vision AI Assistant</p>
      </header>
      
      <main className="app-main">
        {/* Mode Selection */}
        <div className="tabs" style={{ marginBottom: '10px' }}>
          <button
            className={`tab ${mode === 'cooking' ? 'active' : ''}`}
            onClick={() => handleModeChange('cooking')}
          >
            🍳 Cooking
          </button>
          <button
            className={`tab ${mode === 'school' ? 'active' : ''}`}
            onClick={() => handleModeChange('school')}
          >
            📚 School
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => handleTabChange('video')}
          >
            📹 Video File
          </button>
          <button
            className={`tab ${activeTab === 'camera' ? 'active' : ''}`}
            onClick={() => handleTabChange('camera')}
          >
            📷 Live Camera
          </button>
        </div>

        <input
          type="text"
          value={recipeDescription}
          onChange={(e) => setRecipeDescription(e.target.value)}
          placeholder={mode === 'cooking' ? "What are you making?" : "What topic are you studying?"}
          className="recipe-input"
        />

        <div className="cards-row">
          <div className="status-card">
            {activeTab === 'video' ? (
              <>
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
              </>
            ) : (
              <>
                <h2>Live Camera Feed</h2>
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
                    📷 Click "Start Vision" to enable your camera
                  </p>
                  <video
                    ref={cameraVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      backgroundColor: '#000',
                      minHeight: '300px'
                    }}
                  />
                </div>
              </>
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
                disabled={loading || isRunning || (activeTab === 'video' && !videoFile)}
                className="btn btn-start"
              >
                {loading ? 'Starting...' : 'Start'}
              </button>
              <button
                onClick={handleStop}
                disabled={loading || !isRunning}
                className="btn btn-stop"
              >
                {loading ? 'Stopping...' : 'Stop'}
              </button>
            </div>
          </div>

          <div className="results-card">
            <h3>{mode === 'cooking' ? '🤖 AI Cooking Advice' : '🤖 AI Math Tutoring'}</h3>
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
            {isRateLimited && !isGettingAdvice && (
              <div style={{ 
                padding: '10px', 
                backgroundColor: '#fef3c7', 
                borderRadius: '8px',
                marginBottom: '10px',
                color: '#92400e'
              }}>
                ⏱️ Rate limited - waiting to avoid too many requests...
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
                  {mode === 'cooking' 
                    ? 'No AI advice yet. Start the vision service to get real-time cooking tips!'
                    : 'No AI advice yet. Start the vision service to get real-time math tutoring!'}
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

          <div className="results-card checklist-card">
            <h3>📋 {mode === 'cooking' ? 'Recipe Checklist' : 'Problem-Solving Steps'}</h3>
            {isGeneratingChecklist && (
              <div style={{ 
                padding: '10px', 
                backgroundColor: '#fef3c7', 
                borderRadius: '8px',
                marginBottom: '10px',
                color: '#92400e'
              }}>
                ⏳ Generating checklist from video analysis...
              </div>
            )}
            <div className="checklist-container">
              {checklistData ? (
                <>
                  <div className="checklist-title">{checklistData.title}</div>
                  <div className="checklist-items">
                    {checklistData.checklist.map((item) => (
                      <div 
                        key={item.id} 
                        className={`checklist-item ${item.completed ? 'completed' : ''}`}
                        onClick={() => toggleChecklistItem(item.id)}
                      >
                        <div className="checklist-checkbox">
                          {item.completed ? '✓' : ''}
                        </div>
                        <span className="checklist-text">{item.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="checklist-progress">
                    {checklistData.checklist.filter(item => item.completed).length} / {checklistData.checklist.length} completed
                  </div>
                </>
              ) : (
                <div className="results-empty">
                  {isRunning 
                    ? 'Checklist will be generated after 10 seconds of video analysis...'
                    : 'Start the vision service to generate a checklist.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
