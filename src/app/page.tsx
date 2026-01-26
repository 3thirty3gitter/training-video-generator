'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Download, Camera, Wand2, Save, RotateCcw, Monitor, Video } from 'lucide-react'
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
}

export default function Home() {
    const [projectName, setProjectName] = useState('')
    const [appUrl, setAppUrl] = useState('')
    const [steps, setSteps] = useState<TutorialStep[]>([])
    const [currentStep, setCurrentStep] = useState<string | null>(null)
    const [isCapturing, setIsCapturing] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isInteractive, setIsInteractive] = useState(false)
    const [loginWaitTime, setLoginWaitTime] = useState(0)
    const [showWizard, setShowWizard] = useState(false)
    const [loaded, setLoaded] = useState(false)

    // Load from PROJECT_DATA.JSON on mount
    useEffect(() => {
        async function loadProject() {
            try {
                const res = await fetch('/api/project/load')
                const data = await res.json()
                setProjectName(data.projectName || '')
                setAppUrl(data.appUrl || '')
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
                const dataToSave = { projectName, appUrl, steps }
                await fetch('/api/project/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataToSave)
                })
                console.log('Project auto-saved to disk')
            } catch (e) {
                console.error('Auto-save failed', e)
            }
        }

        const timeoutId = setTimeout(saveProject, 1000)
        return () => clearTimeout(timeoutId)
    }, [projectName, appUrl, steps, loaded])

    const clearAll = async () => {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            try {
                await fetch('/api/project/load', { method: 'POST' }) // POST to load clears it
                setProjectName('')
                setAppUrl('')
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

    const generateNarration = async (id: string) => {
        const step = steps.find(s => s.id === id)
        if (!step) return

        setIsGenerating(true)
        try {
            const res = await fetch('/api/generate-narration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step })
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

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-100">
                        <Camera size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Video Generator Pro</h1>
                        <p className="text-xs text-slate-500 font-medium">Create professional training guides automatically</p>
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
                <aside className="w-96 bg-white border-r border-slate-200 flex flex-col shadow-sm">
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                Tutorial Steps
                                <span className="text-xs bg-slate-100 text-slate-500 py-0.5 px-2 rounded-full">{steps.length}</span>
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
                                    onClick={addStep}
                                    className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                    title="Add step manually"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Project Name</label>
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-600 transition-all outline-none"
                                    placeholder="e.g. Dashboard Walkthrough"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Application URL</label>
                                <input
                                    type="url"
                                    value={appUrl}
                                    onChange={(e) => setAppUrl(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-600 transition-all outline-none"
                                    placeholder="https://app.example.com"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                onClick={() => setCurrentStep(step.id)}
                                className={`group relative p-4 rounded-2xl transition-all cursor-pointer border shadow-sm ${currentStep === step.id
                                    ? 'bg-purple-600 border-purple-500 text-white shadow-purple-200'
                                    : 'bg-white border-slate-100 hover:border-purple-300 hover:shadow-md'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black ${currentStep === step.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        {index + 1}
                                    </span>
                                    <div className="flex-1 overflow-hidden">
                                        <div className={`font-bold text-sm truncate ${currentStep === step.id ? 'text-white' : 'text-slate-700'}`}>
                                            {step.title || 'Untitled Step'}
                                        </div>
                                        <div className={`text-[10px] truncate ${currentStep === step.id ? 'text-purple-100' : 'text-slate-400'}`}>
                                            {step.action || 'No action defined'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteStep(step.id); }}
                                        className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-md transition-all ${currentStep === step.id ? 'hover:bg-red-500 text-white' : 'hover:bg-red-50 text-red-500'
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

                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">
                            {steps.length > 0 ? 'Project saved to disk' : 'Ready to start'}
                        </div>
                    </div>
                </aside>

                {/* Editor Area */}
                <main className="flex-1 bg-slate-50 p-10 overflow-auto">
                    {currentStep ? (
                        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {steps.find(s => s.id === currentStep) && (
                                <StepEditor
                                    step={steps.find(s => s.id === currentStep)!}
                                    onUpdate={(updates) => updateStep(currentStep, updates)}
                                    onGenerateNarration={() => generateNarration(currentStep)}
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
                            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-slate-200 shadow-xl shadow-slate-200/50 mb-8 border border-slate-100">
                                <Wand2 size={48} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 mb-3">Welcome to Tutorial Builder</h2>
                            <p className="text-slate-500 leading-relaxed mb-10">
                                Select a step from the sidebar to edit its content, or use the
                                <strong className="text-purple-600 mx-1">Magic Wand</strong> to launch the interactive capture browser.
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
                </main>
            </div>

            {showWizard && (
                <WizardOverlay
                    isOpen={showWizard}
                    onClose={() => setShowWizard(false)}
                    onAddStep={handleWizardAddStep}
                    initialUrl={appUrl}
                />
            )}
        </main>
    )
}
