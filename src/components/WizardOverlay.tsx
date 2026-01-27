
import { useState, useRef, useEffect } from 'react'
import { X, Camera, Plus, Loader2, Play, AlertCircle, Video, Square } from 'lucide-react'

interface WizardOverlayProps {
    isOpen: boolean
    onClose: () => void
    onAddStep: (step: any) => void
    initialUrl: string
}

type WizardState = 'idle' | 'starting' | 'waiting-for-user' | 'recording' | 'analyzing' | 'review' | 'error'
type CaptureMode = 'snapshot' | 'video'

export default function WizardOverlay({ isOpen, onClose, onAddStep, initialUrl }: WizardOverlayProps) {
    const [url, setUrl] = useState(initialUrl)
    const [state, setState] = useState<WizardState>('idle')
    const [mode, setMode] = useState<CaptureMode>('snapshot')
    const [error, setError] = useState<string | null>(null)
    const [currentResult, setCurrentResult] = useState<any>(null)
    const [logs, setLogs] = useState<string[]>([])
    const [recordTime, setRecordTime] = useState(0)
    const timerRef = useRef<any>(null)

    const addLog = (msg: string) => {
        console.log(`[Wizard] ${msg}`)
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50))
    }

    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return

            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault()
                
                // Idle -> Start
                if (state === 'idle' && url) {
                    startSession()
                } 
                // Review -> Add Step
                else if (state === 'review') {
                    handleAddStep()
                }
                // Waiting (Video) -> Start Record
                else if (state === 'waiting-for-user' && mode === 'video') {
                    triggerBrowserStart()
                }
                // Recording -> Stop Record
                else if (state === 'recording') {
                    handleStopRecording()
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, state, url, currentResult, mode])

    // Effect for the 20s recording timer
    useEffect(() => {
        if (state === 'recording') {
            setRecordTime(0)
            timerRef.current = setInterval(() => {
                setRecordTime(prev => {
                    if (prev >= 19) {
                        handleStopRecording();
                        return 20;
                    }
                    return prev + 1;
                })
            }, 1000)
        } else {
            if (timerRef.current) clearInterval(timerRef.current)
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }, [state])

    const startSession = async () => {
        if (!url) return
        setState('starting')
        setError(null)
        setLogs([])
        addLog(`Starting session for: ${url}`)

        try {
            const res = await fetch('/api/wizard/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            })
            if (!res.ok) throw new Error(`Start failed: ${res.status}`)
            addLog('Start success. Browser window should be open.')
            waitForCapture()
        } catch (err) {
            addLog(`Error: ${err}`)
            setError('Could not start browser.')
            setState('idle')
        }
    }

    const [isCapturing, setIsCapturing] = useState(false)

    const waitForCapture = async () => {
        if (isCapturing) return;
        setIsCapturing(true);
        setState('waiting-for-user')
        setCurrentResult(null)
        addLog(`Mode: ${mode === 'snapshot' ? 'Snapshots' : 'Video Recording'}`)
        addLog('Waiting for you to click "Capture" in the browser...')

        try {
            // This is the snapshot loop. If we are in video mode, we might handle it differently.
            // But for now, let's keep the capture route as the primary "listening" route.
            const res = await fetch('/api/wizard/capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode }) // Tell backend if we want snapshot or video trigger
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Capture failed')
            }

            const data = await res.json()

            if (data.action === 'started_recording') {
                addLog('Recording started in browser!')
                setState('recording')
                // IMPORTANT: Immediately start waiting for the STOP interaction
                waitForCapture()
                return;
            }

            if (data.type === 'video') {
                addLog('AI Video Analysis Complete!')
                setCurrentResult(data)
                setState('review')
                return;
            }

            addLog(`Captured: ${data.title}`)
            setCurrentResult(data)
            setState('review')
        } catch (err) {
            addLog(`Error: ${err}`)
            setError('Session interrupted.')
            setState('error')
        } finally {
            setIsCapturing(false)
        }
    }

    const handleStopRecording = async () => {
        setState('analyzing')
        addLog('Stopping recording and analyzing with AI (this may take 15s)...')
        try {
            const res = await fetch('/api/wizard/video/stop', { method: 'POST' })
            if (!res.ok) throw new Error('Video processing failed')
            const data = await res.json()
            addLog('AI Video Analysis Complete!')
            setCurrentResult(data)
            setState('review')
        } catch (err) {
            addLog(`Error: ${err}`)
            setError('Video analysis failed.')
            setState('error')
        }
    }

    const triggerBrowserStart = async () => {
        try {
            addLog('Manually triggering recording start...')
            const res = await fetch('/api/wizard/video/start', { method: 'POST' })
            if (res.ok) {
                addLog('Recording started successfully!')
                setState('recording')
                waitForCapture()
            }
        } catch (err) {
            addLog(`Trigger failed: ${err}`)
        }
    }

    const handleAddStep = () => {
        if (!currentResult) return
        onAddStep(currentResult)
        waitForCapture()
    }

    const stopSession = async () => {
        try {
            addLog('Stopping session...')
            await fetch('/api/wizard/stop', { method: 'POST' })
        } catch (err) { }
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white text-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                            {state === 'recording' ? <Video className="animate-pulse" /> : <Play size={22} fill="currentColor" />}
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 text-lg">Interactive Wizard</h2>
                            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">
                                {state === 'recording' ? `Recording Actions (${recordTime}s)` : 'Continuous Capture Active'}
                            </p>
                        </div>
                    </div>
                    <button onClick={stopSession} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto flex-1">
                    {state === 'idle' && (
                        <div className="text-center py-4">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Ready to Start?</h3>
                            <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                                This will open a browser window where you can navigate and capture steps on the fly.
                            </p>

                            <div className="max-w-md mx-auto mb-8 space-y-4">
                                <div>
                                    <label className="block text-left text-sm font-bold text-slate-700 mb-2 px-1">Capture Mode</label>
                                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                                        <button
                                            onClick={() => setMode('snapshot')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'snapshot' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <Camera size={18} />
                                            Snapshot
                                        </button>
                                        <button
                                            onClick={() => setMode('video')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'video' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <Video size={18} />
                                            Video Action
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-left text-sm font-bold text-slate-700 mb-2 px-1">App Start URL</label>
                                    <input
                                        type="url"
                                        value={url}
                                        onChange={e => setUrl(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all outline-none"
                                        placeholder="https://example.com"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={startSession}
                                disabled={!url}
                                className="w-full max-w-md px-8 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 transition-all shadow-xl shadow-purple-100 hover:shadow-purple-200"
                            >
                                Launch & Record Steps (Enter)
                            </button>
                        </div>
                    )}

                    {state === 'starting' && (
                        <div className="text-center py-16">
                            <Loader2 size={56} className="mx-auto mb-6 text-purple-600 animate-spin" />
                            <h3 className="text-xl font-bold text-slate-900">Firing up the browser...</h3>
                        </div>
                    )}

                    {state === 'analyzing' && (
                        <div className="text-center py-16">
                            <Loader2 size={56} className="mx-auto mb-6 text-purple-600 animate-spin" />
                            <h3 className="text-xl font-bold text-slate-900">Gemini is watching your clip...</h3>
                            <p className="text-slate-500 text-sm mt-4">Generating intelligent narration...</p>
                        </div>
                    )}

                    {state === 'waiting-for-user' && (
                        <div className="text-center py-10">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse border-4 border-white shadow-xl ${mode === 'snapshot' ? 'bg-purple-50 text-purple-600 shadow-purple-50' : 'bg-red-50 text-red-600 shadow-red-50'}`}>
                                {mode === 'snapshot' ? <Camera size={40} /> : <Video size={40} />}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">
                                {mode === 'snapshot' ? 'Click Capture Step' : 'Click Start Record'}
                            </h3>
                            <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed mb-6">
                                {mode === 'snapshot'
                                    ? 'Go to your app, navigate, and click the snapshot button.'
                                    : 'A video button has been added. Click it or press SPACE to start/stop action.'}
                            </p>

                            {mode === 'video' && (
                                <button
                                    onClick={triggerBrowserStart}
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-100 flex items-center gap-2 mx-auto"
                                >
                                    <Video size={18} />
                                    Start Recording Now
                                </button>
                            )}
                        </div>
                    )}

                    {state === 'recording' && (
                        <div className="text-center py-10">
                            <div className="w-24 h-24 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse shadow-2xl shadow-red-200">
                                <Square size={48} fill="currentColor" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-1">Recording Action...</h3>
                            <div className="text-4xl font-black text-red-600 font-mono mb-4">{20 - recordTime}s</div>
                            <p className="text-slate-500 max-w-xs mx-auto text-sm font-medium">
                                Perform your action now. <br />
                                Press <kbd className="bg-slate-100 px-1.5 py-0.5 rounded border shadow-sm">Space</kbd> or click the button to finish.
                            </p>
                            <button
                                onClick={handleStopRecording}
                                className="mt-8 px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-black transition-colors"
                            >
                                Finish Early
                            </button>
                        </div>
                    )}

                    {state === 'review' && currentResult && (
                        <div className="space-y-6">
                            <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-md flex items-center justify-center relative bg-black">
                                {currentResult.videoUrl ? (
                                    <video
                                        src={currentResult.videoUrl}
                                        autoPlay
                                        loop
                                        muted
                                        controls
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <img
                                        src={currentResult.screenshot}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                <div className="absolute top-4 left-4">
                                    <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg">
                                        {currentResult.type?.toUpperCase() || 'SNAPSHOT'}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 text-slate-800">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Context</label>
                                    <div className="font-bold text-slate-800">{currentResult.title}</div>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest block mb-1">AI Video Narration</label>
                                    <div className="text-slate-700 italic leading-relaxed font-medium text-sm">
                                        "{currentResult.narration}"
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {state === 'error' && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h3>
                            <p className="text-red-500 mb-8 font-medium">{error}</p>
                            <button
                                onClick={() => setState('idle')}
                                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-6">
                    {/* Log Terminal */}
                    {!['recording', 'analyzing'].includes(state) && (
                        <div className="bg-slate-900 rounded-xl p-4 h-40 overflow-y-auto font-mono text-[10px] text-purple-300 border border-slate-800 shadow-inner">
                            <div className="text-[9px] text-slate-500 mb-2 border-b border-slate-800 pb-1 flex justify-between">
                                <span>SESSION LOGS</span>
                                <span className="animate-pulse">● LIVE</span>
                            </div>
                            {logs.length === 0 ? <span className="opacity-20">Waiting for start...</span> : logs.map((l, i) => (
                                <div key={i} className="mb-1 leading-tight">{l}</div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        {state === 'review' ? (
                            <div className="flex gap-4 w-full">
                                <button
                                    onClick={waitForCapture}
                                    className="flex-1 px-6 py-4 bg-white text-slate-600 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-all"
                                >
                                    Dismiss
                                </button>
                                <button
                                    onClick={handleAddStep}
                                    className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-100"
                                >
                                    <Plus size={20} />
                                    Add this Step (Enter)
                                </button>
                            </div>
                        ) : (
                            <div className="flex justify-between w-full">
                                <div className="flex items-center gap-2">
                                    {state === 'waiting-for-user' && (
                                        <>
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                                            <span className="text-xs font-bold text-slate-400 uppercase">
                                                {mode === 'snapshot' ? 'Waiting for Snapshot...' : 'Ready to record action...'}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <button
                                    onClick={stopSession}
                                    disabled={state === 'recording' || state === 'analyzing'}
                                    className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-30"
                                >
                                    {state === 'idle' ? 'Cancel' : 'Finish & Close Session'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
