'use client'

import { useState } from 'react'
import { Play, Plus, Trash2, Download, Camera, Wand2 } from 'lucide-react'
import StepEditor from '@/components/StepEditor'
import PreviewPanel from '@/components/PreviewPanel'

export interface TutorialStep {
    id: string
    title: string
    action: string
    narration: string
    screenshot?: string
    waitTime?: number
}

export default function Home() {
    const [projectName, setProjectName] = useState('')
    const [appUrl, setAppUrl] = useState('')
    const [steps, setSteps] = useState<TutorialStep[]>([])
    const [currentStep, setCurrentStep] = useState<string | null>(null)
    const [isCapturing, setIsCapturing] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)

    const addStep = () => {
        const newStep: TutorialStep = {
            id: `step-${Date.now()}`,
            title: 'New Step',
            action: '',
            narration: '',
            waitTime: 1000,
        }
        setSteps([...steps, newStep])
        setCurrentStep(newStep.id)
    }

    const updateStep = (id: string, updates: Partial<TutorialStep>) => {
        setSteps(steps.map(step =>
            step.id === id ? { ...step, ...updates } : step
        ))
    }

    const deleteStep = (id: string) => {
        setSteps(steps.filter(step => step.id !== id))
        if (currentStep === id) {
            setCurrentStep(steps[0]?.id || null)
        }
    }

    const captureScreenshots = async () => {
        if (!appUrl) {
            alert('Please enter your app URL first')
            return
        }

        setIsCapturing(true)
        try {
            const response = await fetch('/api/capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: appUrl, steps }),
            })

            if (!response.ok) throw new Error('Capture failed')

            const result = await response.json()

            // Update steps with screenshots
            setSteps(result.steps)
            alert('Screenshots captured successfully!')
        } catch (error) {
            console.error('Capture error:', error)
            alert('Failed to capture screenshots. Check console for details.')
        } finally {
            setIsCapturing(false)
        }
    }

    const generateNarration = async (stepId: string) => {
        const step = steps.find(s => s.id === stepId)
        if (!step) return

        setIsGenerating(true)
        try {
            const response = await fetch('/api/generate-narration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: step.title,
                    action: step.action,
                    context: projectName
                }),
            })

            if (!response.ok) throw new Error('Generation failed')

            const result = await response.json()
            updateStep(stepId, { narration: result.narration })
        } catch (error) {
            console.error('Generation error:', error)
            alert('Failed to generate narration. Using template.')
            // Fallback to template
            updateStep(stepId, {
                narration: `In this step, we'll ${step.action}. ${step.title}.`
            })
        } finally {
            setIsGenerating(false)
        }
    }

    const exportDocument = async () => {
        if (steps.length === 0) {
            alert('Add some steps first!')
            return
        }

        try {
            const response = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectName: projectName || 'Training Tutorial',
                    steps
                }),
            })

            if (!response.ok) throw new Error('Export failed')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${projectName || 'tutorial'}-notebooklm.docx`
            a.click()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Export error:', error)
            alert('Failed to export document. Check console for details.')
        }
    }

    const currentStepData = steps.find(s => s.id === currentStep)

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                📹 Training Video Generator
                            </h1>
                            <p className="text-sm text-slate-600 mt-1">
                                Create NotebookLM-ready training videos automatically
                            </p>
                        </div>
                        <button
                            onClick={exportDocument}
                            disabled={steps.length === 0}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Download size={18} />
                            Export for NotebookLM
                        </button>
                    </div>
                </div>
            </header>

            {/* Project Setup */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Project Setup</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Project Name
                            </label>
                            <input
                                type="text"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder="e.g., MyApp User Guide"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                App URL
                            </label>
                            <input
                                type="url"
                                value={appUrl}
                                onChange={(e) => setAppUrl(e.target.value)}
                                placeholder="https://your-app.com"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-3 gap-6">
                    {/* Steps List */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">Tutorial Steps</h2>
                            <button
                                onClick={addStep}
                                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                title="Add Step"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        {steps.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Camera size={48} className="mx-auto mb-3 opacity-50" />
                                <p className="text-sm">No steps yet</p>
                                <p className="text-xs mt-1">Click + to add your first step</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {steps.map((step, index) => (
                                    <div
                                        key={step.id}
                                        onClick={() => setCurrentStep(step.id)}
                                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${currentStep === step.id
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-semibold text-slate-500">
                                                        Step {index + 1}
                                                    </span>
                                                    {step.screenshot && (
                                                        <span className="text-xs text-green-600">✓ Screenshot</span>
                                                    )}
                                                </div>
                                                <h3 className="text-sm font-medium text-slate-900 mb-1">
                                                    {step.title || 'Untitled Step'}
                                                </h3>
                                                <p className="text-xs text-slate-600 line-clamp-2">
                                                    {step.narration || 'No narration yet'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    deleteStep(step.id)
                                                }}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {steps.length > 0 && (
                            <button
                                onClick={captureScreenshots}
                                disabled={isCapturing || !appUrl}
                                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isCapturing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Capturing...
                                    </>
                                ) : (
                                    <>
                                        <Camera size={18} />
                                        Capture All Screenshots
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Step Editor */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        {currentStepData ? (
                            <StepEditor
                                step={currentStepData}
                                onUpdate={(updates) => updateStep(currentStepData.id, updates)}
                                onGenerateNarration={() => generateNarration(currentStepData.id)}
                                isGenerating={isGenerating}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                <div className="text-center">
                                    <Wand2 size={48} className="mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">Select a step to edit</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <PreviewPanel steps={steps} currentStepId={currentStep} />
                    </div>
                </div>
            </div>
        </div>
    )
}
