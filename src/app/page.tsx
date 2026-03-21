'use client'

import { useRef, useState, useEffect } from 'react'
import { Plus, Trash2, Download, Camera, Wand2, Save, RotateCcw, Monitor, Video, Play, Upload, Globe } from 'lucide-react'
import StepEditor from '@/components/StepEditor'
import PreviewPanel from '@/components/PreviewPanel'
import WizardOverlay from '@/components/WizardOverlay'

export interface TutorialStep {
    id: string
    title: string
    action: string
    narration: string
    type: 'image' | 'video'
    screenshot?: string // Still used for thumbnail
    videoUrl?: string
    waitTime?: number
    customAudioUrl?: string
}

export default function Home() {
    const [projectName, setProjectName] = useState('')
    const [appUrl, setAppUrl] = useState('')
    const [voice, setVoice] = useState('com')
    const [voiceStyle, setVoiceStyle] = useState('normal')
    const [voiceSpeed, setVoiceSpeed] = useState(1)
    const [backgroundMusic, setBackgroundMusic] = useState('none')
    const [musicVolume, setMusicVolume] = useState(0.1)
    const [steps, setSteps] = useState<TutorialStep[]>([])
    const [currentStep, setCurrentStep] = useState<string | null>(null)
    const [isCapturing, setIsCapturing] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isGeneratingAll, setIsGeneratingAll] = useState(false)
    const [generateAllProgress, setGenerateAllProgress] = useState<{ current: number; total: number } | null>(null)
    const [isInteractive, setIsInteractive] = useState(false)
    const [loginWaitTime, setLoginWaitTime] = useState(0)
    const [showWizard, setShowWizard] = useState(false)
    const [includeCaptions, setIncludeCaptions] = useState(false)
    const [transition, setTransition] = useState('none')
    const [loaded, setLoaded] = useState(false)

    // Music Preview State
    const [isMusicPreviewing, setIsMusicPreviewing] = useState(false)
    const musicAudioRef = useRef<HTMLAudioElement | null>(null)

    // Load from PROJECT_DATA.JSON on mount
    useEffect(() => {
        async function loadProject() {
            try {
                const res = await fetch('/api/project/load')
                const data = await res.json()
                setProjectName(data.projectName || '')
                setAppUrl(data.appUrl || '')
                setVoice(data.voice || 'com')
                setVoiceStyle(data.voiceStyle || 'normal')
                setVoiceSpeed(data.voiceSpeed || 1)
                // Default to false if not present
                setIncludeCaptions(data.includeCaptions === true)
                setIncludeCaptions(data.includeCaptions === true)
                setTransition(data.transition || 'none')
                setBackgroundMusic(data.backgroundMusic || 'none')
                setMusicVolume(data.musicVolume || 0.1)
                setSteps(data.steps || [])
                if (data.steps && data.steps.length > 0) {
                    setCurrentStep(data.steps[0].id)
                }
            } catch (e) {
                console.error('Failed to load project from disk', e)
            } finally {
                setLoaded(true)
            }
        }
        loadProject()
    }, [])

    // Auto-save to DISK
    useEffect(() => {
        if (!loaded) return

        const saveProject = async () => {
            try {
                const dataToSave = { projectName, appUrl, voice, voiceStyle, voiceSpeed, includeCaptions, transition, backgroundMusic, musicVolume, steps }
                await fetch('/api/project/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataToSave)
                })
                console.log('Project auto-saved to disk', { voice, voiceStyle, voiceSpeed })
            } catch (e) {
                console.error('Auto-save failed', e)
            }
        }

        const timeoutId = setTimeout(saveProject, 1000)
        return () => clearTimeout(timeoutId)
    }, [projectName, appUrl, voice, voiceStyle, voiceSpeed, includeCaptions, transition, backgroundMusic, musicVolume, steps, loaded])

    const clearAll = async () => {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            try {
                await fetch('/api/project/load', { method: 'POST' }) // POST to load clears it
                setProjectName('')
                setAppUrl('')
                setVoice('com')
                setTransition('none')
                setBackgroundMusic('none')
                setMusicVolume(0.1)
                setSteps([])
                setCurrentStep(null)
                localStorage.removeItem('training-video-gen-data') // Also clear legacy
            } catch (e) {
                console.error('Clear failed', e)
            }
        }
    }

    const handleWizardAddStep = (stepData: any) => {
        const newStep: TutorialStep = {
            id: `step-${Date.now()}`,
            title: stepData.title || '',
            action: stepData.action || '',
            narration: stepData.narration || '',
            type: stepData.videoUrl ? 'video' : 'image',
            screenshot: stepData.screenshot || '',
            videoUrl: stepData.videoUrl || '',
            waitTime: 1000,
        }
        setSteps(prev => [...prev, newStep])
        setCurrentStep(newStep.id)
    }

    const addStep = () => {
        const id = `step-${Date.now()}`
        const newStep: TutorialStep = {
            id,
            title: '',
            action: '',
            narration: '',
            type: 'image',
            waitTime: 1000
        }
        setSteps(prev => [...prev, newStep]);
        setCurrentStep(id);
    }

    const updateStep = (id: string, updates: Partial<TutorialStep>) => {
        setSteps(steps.map(step =>
            step.id === id ? { ...step, ...updates } : step
        ))
    }

    const deleteStep = (id: string) => {
        setSteps(steps.filter(step => step.id !== id))
        if (currentStep === id) {
            setCurrentStep(null)
        }
    }

    const generateNarration = async (id: string, overrides?: Partial<TutorialStep>) => {
        const step = steps.find(s => s.id === id)
        if (!step) return

        setIsGenerating(true)
        try {
            const mergedStep = { ...step, ...overrides }
            const res = await fetch('/api/generate-narration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step: mergedStep })
            })
            const data = await res.json()
            if (data.narration) {
                updateStep(id, { narration: data.narration })
            }
        } catch (e) {
            console.error('Narration generation failed', e)
        } finally {
            setIsGenerating(false)
        }
    }

    const reanalyzeVideo = async (id: string) => {
        const step = steps.find(s => s.id === id)
        if (!step?.videoUrl) return
        setIsGenerating(true)
        try {
            const res = await fetch('/api/analyze-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoUrl: step.videoUrl }),
            })
            const data = await res.json()
            if (data.success) {
                updateStep(id, { title: data.title, narration: data.narration })
            } else {
                alert('Re-analyze failed: ' + data.error)
            }
        } catch (e) {
            console.error('Re-analyze error:', e)
            alert('Failed to re-analyze video')
        } finally {
            setIsGenerating(false)
        }
    }

    const generateAllNarrations = async () => {
        const pending = steps.filter(
            s => s.type === 'video' && s.videoUrl &&
            (s.narration === 'Video action recorded successfully.' || s.title === 'Video Action')
        )
        if (pending.length === 0) {
            alert('No video steps with missing narration found.')
            return
        }
        setIsGeneratingAll(true)
        setGenerateAllProgress({ current: 0, total: pending.length })
        for (let i = 0; i < pending.length; i++) {
            setGenerateAllProgress({ current: i + 1, total: pending.length })
            const step = pending[i]
            try {
                const res = await fetch('/api/analyze-video', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videoUrl: step.videoUrl }),
                })
                const data = await res.json()
                if (data.success) {
                    updateStep(step.id, { title: data.title, narration: data.narration })
                }
            } catch (e) {
                console.error(`Failed to analyze step ${step.id}:`, e)
            }
            // Small delay to avoid rate limiting
            if (i < pending.length - 1) await new Promise(r => setTimeout(r, 1000))
        }
        setIsGeneratingAll(false)
        setGenerateAllProgress(null)
    }

    const exportToVideo = () => {
        alert('Exporting to video... (Processing screenshots and narrations)')
    }

    const renderVideo = async () => {
        if (isGenerating) return
        setIsGenerating(true)
        try {
            const res = await fetch('/api/export/video', { method: 'POST' })
            const data = await res.json()
            if (data.success && data.videoUrl) {
                window.open(data.videoUrl, '_blank')
            } else {
                alert('Render failed: ' + (data.error || 'Unknown error'))
            }
        } catch (e) {
            console.error('Render error:', e)
            alert('Failed to connect to render engine')
        } finally {
            setIsGenerating(false)
        }
    }

    const [isPlayingPreview, setIsPlayingPreview] = useState(false)
    const playVoicePreview = async () => {
        if (isPlayingPreview) return
        setIsPlayingPreview(true)
        try {
            const res = await fetch('/api/voice-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voice, voiceStyle, voiceSpeed })
            })
            const data = await res.json()
            if (data.success && data.audioUrl) {
                const audio = new Audio(data.audioUrl)
                audio.onended = () => setIsPlayingPreview(false)
                audio.onerror = () => setIsPlayingPreview(false)
                audio.play()
            } else {
                setIsPlayingPreview(false)
                alert('Wait, we cannot generate a preview for this voice right now.')
            }
        } catch (e) {
            console.error('Preview error', e)
            console.error('Preview error', e)
            setIsPlayingPreview(false)
        }
    }

    const toggleMusicPreview = () => {
        if (isMusicPreviewing) {
            // Stop
            if (musicAudioRef.current) {
                musicAudioRef.current.pause()
                musicAudioRef.current = null
            }
            setIsMusicPreviewing(false)
        } else {
            // Start
            if (backgroundMusic === 'none') return

            const musicMap: Record<string, string> = {
                'upbeat': 'upbeat.mp3',
                'lofi': 'lofi.mp3',
                'cinematic': 'cinematic.mp3',
                'modern': 'modern.mp3',
                'piano': 'piano.mp3',
                'groove': 'groove.mp3'
            }

            const filename = musicMap[backgroundMusic]
            if (!filename) return

            // Add timestamp to bust cache if we just uploaded
            const audio = new Audio(`/music/${filename}?t=${Date.now()}`)
            audio.volume = musicVolume
            audio.loop = true
            audio.play().catch(e => console.error("Playback failed", e))

            musicAudioRef.current = audio
            setIsMusicPreviewing(true)

            // Cleanup on end (though loop is on, good practice)
            audio.onended = () => {
                setIsMusicPreviewing(false)
                musicAudioRef.current = null
            }
        }
    }

    const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        if (backgroundMusic === 'none') {
            alert('Please select a track slot to replace first.')
            return
        }

        const file = e.target.files[0]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('trackName', backgroundMusic)

        try {
            const res = await fetch('/api/upload-music', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            if (data.success) {
                alert('Track updated! Preview it to hear the new file.')
                // Force stop audio if playing
                if (isMusicPreviewing && musicAudioRef.current) {
                    musicAudioRef.current.pause()
                    setIsMusicPreviewing(false)
                }
            } else {
                alert('Upload failed: ' + data.error)
            }
        } catch (err) {
            console.error(err)
            alert('Failed to upload music track')
        }
    }

    return (
        <main className="min-h-screen bg-transparent text-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-slate-900/60 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-100">
                        <Camera size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">Video Generator Pro</h1>
                        <p className="text-xs text-slate-400 font-medium">Create professional training guides automatically</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={clearAll}
                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                        title="Clear all progress"
                    >
                        <RotateCcw size={20} />
                    </button>
                    <button
                        onClick={exportToVideo}
                        disabled={steps.length === 0}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                    >
                        <Download size={18} />
                        Export Guide
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Steps Sidebar */}
                <aside className="w-96 bg-slate-900/40 backdrop-blur-xl border-r border-white/5 flex flex-col">
                    <div className="p-6 border-b border-white/5">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-bold text-slate-200 flex items-center gap-2">
                                Tutorial Steps
                                <span className="text-xs bg-slate-800/50 text-slate-400 py-0.5 px-2 rounded-full">{steps.length}</span>
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => window.open('/view', '_blank')}
                                    className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                                    title="View Interactive Guide"
                                >
                                    <Monitor size={18} />
                                </button>
                                <button
                                    onClick={() => window.open('/api/export/web', '_blank')}
                                    className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                                    title="Download Standalone Web Guide"
                                >
                                    <Download size={18} />
                                </button>
                                <button
                                    onClick={renderVideo}
                                    disabled={isGenerating}
                                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                                    title="Render Full AI Video Tutorial"
                                >
                                    {isGenerating ? (
                                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Video size={18} />
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowWizard(true)}
                                    className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                                    title="Interactive Wizard"
                                >
                                    <Wand2 size={18} />
                                </button>
                                <button
                                    onClick={generateAllNarrations}
                                    disabled={isGeneratingAll || isGenerating}
                                    className="p-2 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50"
                                    title="Generate narrations for all video steps"
                                >
                                    {isGeneratingAll ? (
                                        <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Wand2 size={18} />
                                    )}
                                </button>
                                <button
                                    onClick={addStep}
                                    className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                    title="Add step manually"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                        {isGeneratingAll && generateAllProgress && (
                            <div className="mt-3 px-1">
                                <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold mb-1">
                                    <span>Analyzing videos with AI...</span>
                                    <span>{generateAllProgress.current} / {generateAllProgress.total}</span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-1.5">
                                    <div
                                        className="bg-amber-500 h-1.5 rounded-full transition-all"
                                        style={{ width: `${(generateAllProgress.current / generateAllProgress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Project Name</label>
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 text-white rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none placeholder-slate-700"
                                    placeholder="e.g. Dashboard Walkthrough"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Application URL</label>
                                <input
                                    type="url"
                                    value={appUrl}
                                    onChange={(e) => setAppUrl(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-white/10 text-white rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none placeholder-slate-700"
                                    placeholder="https://app.example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Narrator</label>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <select
                                            value={voice}
                                            onChange={(e) => setVoice(e.target.value)}
                                            className="flex-1 px-4 py-2.5 bg-slate-950/50 border border-white/10 text-white rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none appearance-none cursor-pointer"
                                            title="Select narrator"
                                        >
                                            <optgroup label="🌟 Kokoro (High Quality Neural)">
                                                <option value="kokoro-af_sarah">Sarah (US Female)</option>
                                                <option value="kokoro-af_nicole">Nicole (US Female)</option>
                                                <option value="kokoro-af_bella">Bella (US Female)</option>
                                                <option value="kokoro-am_michael">Michael (US Male)</option>
                                                <option value="kokoro-am_adam">Adam (US Male)</option>
                                                <option value="kokoro-bf_emma">Emma (UK Female)</option>
                                                <option value="kokoro-bm_george">George (UK Male)</option>
                                            </optgroup>
                                            <optgroup label="🇺🇸 United States">
                                                <option value="us-aria">Aria (Professional)</option>
                                                <option value="us-guy">Guy (Casual)</option>
                                                <option value="us-jenny">Jenny (Friendly)</option>
                                                <option value="us-christopher">Christopher (Serious)</option>
                                                <option value="us-eric">Eric (Business)</option>
                                                <option value="us-michelle">Michelle (Warm)</option>
                                                <option value="us-roger">Roger (Authoritative)</option>
                                            </optgroup>
                                            <optgroup label="🇬🇧 United Kingdom">
                                                <option value="uk-sonia">Sonia (Professional)</option>
                                                <option value="uk-ryan">Ryan (Casual)</option>
                                                <option value="uk-libby">Libby (Friendly)</option>
                                                <option value="uk-abbi">Abbi (Serious)</option>
                                            </optgroup>
                                            <optgroup label="🇦🇺 Australia">
                                                <option value="au-natasha">Natasha</option>
                                                <option value="au-william">William</option>
                                            </optgroup>
                                            <optgroup label="🇮🇳 India">
                                                <option value="in-neerja">Neerja</option>
                                                <option value="in-prabhat">Prabhat</option>
                                            </optgroup>
                                        </select>
                                        <button
                                            onClick={playVoicePreview}
                                            disabled={isPlayingPreview}
                                            className="px-3 bg-slate-800/50 border border-white/5 text-slate-300 rounded-xl hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                                            title="Preview Voice"
                                        >
                                            {isPlayingPreview ? (
                                                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] font-bold">Try</span>
                                                </div>
                                            )}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[9px] font-bold text-slate-500 mb-1 ml-1">Tone</label>
                                            <select
                                                value={voiceStyle}
                                                onChange={(e) => setVoiceStyle(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-950/50 border border-white/10 text-white rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                            >
                                                <option value="normal">Normal</option>
                                                <optgroup label="Cheerful">
                                                    <option value="cheerful">Cheerful (Brisk)</option>
                                                    <option value="cheerful-2">Cheerful (Bright)</option>
                                                    <option value="cheerful-3">Cheerful (Excited)</option>
                                                </optgroup>
                                                <optgroup label="Serious">
                                                    <option value="serious">Serious (Calm)</option>
                                                    <option value="serious-2">Serious (Deep)</option>
                                                    <option value="serious-3">Serious (Authoritative)</option>
                                                </optgroup>
                                                <optgroup label="Business">
                                                    <option value="business">Business (Professional)</option>
                                                    <option value="business-2">Business (Direct)</option>
                                                    <option value="business-3">Business (Soft)</option>
                                                </optgroup>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-slate-500 mb-1 ml-1">Speed</label>
                                            <select
                                                value={voiceSpeed}
                                                onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                                                className="w-full px-3 py-2 bg-slate-950/50 border border-white/10 text-white rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                            >
                                                <option value={0.75}>0.75x (Slow)</option>
                                                <option value={1}>1.0x (Normal)</option>
                                                <option value={1.1}>1.1x (Brisk)</option>
                                                <option value={1.25}>1.25x (Fast)</option>
                                                <option value={1.5}>1.5x (Rapid)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center gap-3 bg-slate-950/30 border border-white/5 p-2 rounded-xl">
                                        <div
                                            onClick={() => setIncludeCaptions(!includeCaptions)}
                                            className={`relative w-10 h-6 transition-colors rounded-full cursor-pointer ${includeCaptions ? 'bg-purple-600' : 'bg-slate-700'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${includeCaptions ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <label className="text-xs font-bold text-slate-400 cursor-pointer" onClick={() => setIncludeCaptions(!includeCaptions)}>
                                            Include Closed Captions
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-bold text-slate-500 mb-1 ml-1 uppercase tracking-wider">Transitions</label>
                                        <select
                                            value={transition}
                                            onChange={(e) => setTransition(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-950/50 border border-white/10 text-white rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                        >
                                            <option value="none">None (Cut)</option>
                                            <option value="fade">Fade to Black</option>
                                        </select>
                                    </div>

                                    <div>
                                        <div className="flex gap-2 mb-2">
                                            <select
                                                value={backgroundMusic}
                                                onChange={(e) => setBackgroundMusic(e.target.value)}
                                                className="flex-1 px-3 py-2 bg-slate-950/50 border border-white/10 text-white rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                            >
                                                <option value="none">None</option>
                                                <option value="upbeat">Upbeat & Corporate</option>
                                                <option value="modern">Modern Tech</option>
                                                <option value="lofi">Lofi Focus</option>
                                                <option value="groove">Funky Groove</option>
                                                <option value="cinematic">Cinematic Ambient</option>
                                                <option value="piano">Soft Piano</option>
                                            </select>
                                            <button
                                                onClick={toggleMusicPreview}
                                                disabled={backgroundMusic === 'none'}
                                                className="px-3 bg-slate-800/50 border border-white/5 text-slate-300 rounded-xl hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                                                title="Preview Music"
                                            >
                                                {isMusicPreviewing ? (
                                                    <div className="w-3 h-3 bg-red-400 rounded-sm" />
                                                ) : (
                                                    <Play size={14} className="fill-current" />
                                                )}
                                            </button>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept="audio/mp3,audio/wav"
                                                    onChange={handleMusicUpload}
                                                    disabled={backgroundMusic === 'none'}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                    title="Replace with your own file"
                                                />
                                                <button
                                                    disabled={backgroundMusic === 'none'}
                                                    className="h-full px-3 bg-slate-800/50 border border-white/5 text-slate-300 rounded-xl hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                                                >
                                                    <Upload size={14} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => window.open('https://www.chosic.com/free-music/', '_blank')}
                                                className="px-3 bg-slate-800/50 border border-white/5 text-indigo-300 rounded-xl hover:bg-indigo-900/30 transition-colors"
                                                title="Browse Royalty Free Music"
                                            >
                                                <Globe size={14} />
                                            </button>
                                        </div>
                                        {backgroundMusic !== 'none' && (
                                            <div className="flex items-center gap-2 px-1">
                                                <span className="text-[9px] text-slate-500 font-bold">VOL</span>
                                                <input
                                                    type="range"
                                                    min="0.05"
                                                    max="0.5"
                                                    step="0.05"
                                                    value={musicVolume}
                                                    onChange={(e) => {
                                                        const vol = parseFloat(e.target.value)
                                                        setMusicVolume(vol)
                                                        if (musicAudioRef.current) {
                                                            musicAudioRef.current.volume = vol
                                                        }
                                                    }}
                                                    className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                onClick={() => setCurrentStep(step.id)}
                                className={`group relative p-4 rounded-2xl transition-all cursor-pointer border shadow-sm ${currentStep === step.id
                                    ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/50'
                                    : 'bg-slate-800/40 border-white/5 hover:border-purple-500/50 hover:bg-slate-800/80'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black ${currentStep === step.id ? 'bg-white/20 text-white' : 'bg-slate-900/50 text-slate-400'
                                        }`}>
                                        {index + 1}
                                    </span>
                                    <div className="flex-1 overflow-hidden">
                                        <div className={`font-bold text-sm truncate ${currentStep === step.id ? 'text-white' : 'text-slate-200'}`}>
                                            {step.title || 'Untitled Step'}
                                        </div>
                                        <div className={`text-[10px] truncate ${currentStep === step.id ? 'text-purple-100' : 'text-slate-500'}`}>
                                            {step.action || 'No action defined'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteStep(step.id); }}
                                        className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-md transition-all ${currentStep === step.id ? 'hover:bg-red-500 text-white' : 'hover:bg-red-500/20 text-red-400'
                                            }`}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {steps.length === 0 && loaded && (
                            <div className="text-center py-12 px-6">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 border-2 border-dashed border-slate-200">
                                    <Plus size={24} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-500">No steps yet</h3>
                                <p className="text-xs text-slate-400 mt-1">Add a step manually or use the Wand to capture them automatically.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-white/5 bg-transparent">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-center">
                            {steps.length > 0 ? 'Project saved to disk' : 'Ready to start'}
                        </div>
                    </div>
                </aside>

                {/* Editor Area */}
                <main className="flex-1 bg-transparent p-10 overflow-auto">
                    {currentStep ? (
                        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {steps.find(s => s.id === currentStep) && (
                                <StepEditor
                                    step={steps.find(s => s.id === currentStep)!}
                                    onUpdate={(updates) => updateStep(currentStep, updates)}
                                    onGenerateNarration={(overrides) => generateNarration(currentStep, overrides)}
                                    onReanalyzeVideo={() => reanalyzeVideo(currentStep)}
                                    isGenerating={isGenerating}
                                />
                            )}
                            <PreviewPanel
                                steps={steps}
                                currentStepId={currentStep}
                            />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                            <div className="w-24 h-24 bg-slate-800/50 rounded-3xl flex items-center justify-center text-slate-500 shadow-xl shadow-black/20 mb-8 border border-white/5">
                                <Wand2 size={48} />
                            </div>
                            <h2 className="text-2xl font-black text-white mb-3">Welcome to Tutorial Builder</h2>
                            <p className="text-slate-400 leading-relaxed mb-10">
                                Select a step from the sidebar to edit its content, or use the
                                <strong className="text-purple-400 mx-1">Magic Wand</strong> to launch the interactive capture browser.
                            </p>
                            <button
                                onClick={() => setShowWizard(true)}
                                className="flex items-center gap-3 px-8 py-4 bg-purple-600 text-white rounded-2xl font-black hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 active:scale-95"
                            >
                                <Wand2 size={24} />
                                Open Interactive Wizard
                            </button>
                        </div>
                    )}

                    {showWizard && (
                        <WizardOverlay
                            isOpen={showWizard}
                            onClose={() => setShowWizard(false)}
                            onAddStep={handleWizardAddStep}
                            initialUrl={appUrl}
                        />
                    )}
                </main>
            </div>
        </main>
    )
}

export interface TutorialStep {
    id: string
    title: string
    action: string
    narration: string
    screenshot?: string
    videoUrl?: string
    type: 'image' | 'video'
    waitTime?: number
    customAudioUrl?: string
    context?: string // Keywords or context for AI
}
