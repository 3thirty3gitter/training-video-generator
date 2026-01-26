'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Play, CheckCircle2, Monitor, ArrowRight, PlayCircle } from 'lucide-react'

interface TutorialStep {
    id: string
    title: string
    action: string
    narration: string
    type: 'image' | 'video'
    screenshot?: string
    videoUrl?: string
}

export default function GuideViewer() {
    const [steps, setSteps] = useState<TutorialStep[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [projectName, setProjectName] = useState('Loading Guide...')
    const [isLoaded, setIsLoaded] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        async function loadData() {
            try {
                const res = await fetch('/api/project/load')
                const data = await res.json()
                setSteps(data.steps || [])
                setProjectName(data.projectName || 'Web Guide')
                setIsLoaded(true)
            } catch (e) {
                console.error('Failed to load guide data')
            }
        }
        loadData()
    }, [])

    const nextStep = () => {
        if (currentIndex < steps.length - 1) {
            setCurrentIndex(prev => prev + 1)
        }
    }

    const prevStep = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
        }
    }

    if (!isLoaded) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )

    if (steps.length === 0) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
            <p>No steps found in this guide.</p>
        </div>
    )

    const step = steps[currentIndex]

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
            {/* Header */}
            <header className="px-8 py-6 border-b border-slate-800 flex items-center justify-between backdrop-blur-md sticky top-0 z-20 bg-slate-950/80">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Monitor size={18} className="text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight">{projectName}</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Interactive Tutorial</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 text-[11px] font-bold text-slate-400">
                        STEP <span className="text-indigo-400">{currentIndex + 1}</span> OF {steps.length}
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-84px)]">
                {/* Visual Area */}
                <div className="flex-[3] bg-slate-900 flex items-center justify-center p-4 lg:p-12 relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

                    <div className="w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] border border-slate-800 relative group animate-in fade-in zoom-in duration-700">
                        {step.type === 'video' ? (
                            <video
                                key={step.id}
                                ref={videoRef}
                                src={step.videoUrl}
                                controls
                                autoPlay
                                loop
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <img
                                src={step.screenshot}
                                alt={step.title}
                                className="w-full h-full object-contain"
                            />
                        )}

                        {/* Overlay Badge */}
                        <div className="absolute top-6 left-6 px-3 py-1.5 bg-slate-950/60 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/80">
                            {step.type === 'video' ? 'Recorded Action' : 'Snapshot'}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-slate-950 border-l border-slate-800 flex flex-col p-8 lg:p-12 justify-between">
                    <div className="space-y-8 animate-in slide-in-from-right duration-500">
                        <div className="space-y-2">
                            <span className="text-indigo-400 font-black text-[12px] uppercase tracking-[0.2em]">Current Step</span>
                            <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight">
                                {step.title || 'Untitled Action'}
                            </h2>
                        </div>

                        <div className="space-y-4">
                            <div className="w-12 h-1 bg-indigo-500 rounded-full" />
                            <p className="text-slate-400 leading-relaxed text-lg lg:text-xl font-medium">
                                {step.narration || "Follow the visual guide to understand this step's interaction."}
                            </p>
                        </div>

                        {step.action && (
                            <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800/50">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Automation Target</span>
                                <code className="text-indigo-300 font-mono text-xs break-all bg-indigo-500/10 px-2 py-1 rounded inline-block">
                                    {step.action}
                                </code>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <div className="pt-12 flex flex-col gap-4">
                        <div className="flex gap-3">
                            <button
                                onClick={prevStep}
                                disabled={currentIndex === 0}
                                className="p-4 bg-slate-900 text-slate-400 rounded-2xl border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 transition-all shadow-xl"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button
                                onClick={nextStep}
                                disabled={currentIndex === steps.length - 1}
                                className="flex-1 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 px-8 disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none disabled:bg-opacity-50"
                            >
                                {currentIndex === steps.length - 1 ? (
                                    <>
                                        <CheckCircle2 size={20} />
                                        Finish Guide
                                    </>
                                ) : (
                                    <>
                                        Next Step
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="flex justify-between px-2">
                            <div className="flex gap-1">
                                {steps.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-800'}`}
                                    />
                                ))}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Progress</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Global Style for Hide Scrollbar */}
            <style jsx global>{`
                ::-webkit-scrollbar {
                    width: 6px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: #334155;
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #475569;
                }
            `}</style>
        </div>
    )
}
