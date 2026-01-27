'use client'

import { TutorialStep } from '@/app/page'
import { FileText } from 'lucide-react'

interface PreviewPanelProps {
    steps: TutorialStep[]
    currentStepId: string | null
}

export default function PreviewPanel({ steps, currentStepId }: PreviewPanelProps) {
    const currentIndex = steps.findIndex(s => s.id === currentStepId)

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Document Preview</h2>

            {steps.length === 0 ? (
                <div className="flex items-center justify-center h-[600px] text-slate-400">
                    <div className="text-center">
                        <FileText size={48} className="mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No steps to preview</p>
                    </div>
                </div>
            ) : (
                <div className="border border-white/10 rounded-lg p-6 bg-slate-900/40 backdrop-blur-md shadow-inner max-h-[600px] overflow-y-auto">
                    <div className="prose prose-sm prose-invert max-w-none">
                        <h1 className="text-2xl font-bold text-white mb-4">
                            Training Tutorial Preview
                        </h1>

                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                className={`mb-8 pb-6 border-b border-white/5 last:border-b-0 ${step.id === currentStepId ? 'bg-purple-900/20 -mx-4 px-4 py-4 rounded-lg' : ''
                                    }`}
                            >
                                <h2 className="text-lg font-semibold text-slate-200 mb-2">
                                    Step {index + 1}: {step.title || 'Untitled'}
                                </h2>

                                {(step.screenshot || step.videoUrl) && (
                                    <div className="my-4 rounded-lg overflow-hidden border border-white/10 bg-black aspect-video flex items-center justify-center">
                                        {step.type === 'video' && step.videoUrl ? (
                                            <video
                                                src={step.videoUrl}
                                                controls
                                                muted
                                                loop
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <img
                                                src={step.screenshot}
                                                alt={step.title}
                                                className="w-full h-auto"
                                            />
                                        )}
                                    </div>
                                )}

                                {step.narration && (
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        {step.narration}
                                    </p>
                                )}

                                {!step.narration && (
                                    <p className="text-sm text-slate-400 italic">
                                        No narration written yet
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="text-xs text-slate-500 bg-slate-950/30 border border-white/5 p-3 rounded-lg">
                <p className="font-medium mb-1 text-slate-400">💡 Preview Notes:</p>
                <ul className="space-y-1 ml-4 list-disc text-slate-500">
                    <li>This shows how your document will look in NotebookLM</li>
                    <li>Each step becomes a slide with narration in the video</li>
                    <li>Screenshots will be embedded in the exported document</li>
                </ul>
            </div>
        </div>
    )
}
