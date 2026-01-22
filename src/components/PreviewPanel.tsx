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
            <h2 className="text-lg font-semibold text-slate-900">Document Preview</h2>

            {steps.length === 0 ? (
                <div className="flex items-center justify-center h-[600px] text-slate-400">
                    <div className="text-center">
                        <FileText size={48} className="mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No steps to preview</p>
                    </div>
                </div>
            ) : (
                <div className="border border-slate-300 rounded-lg p-6 bg-white shadow-inner max-h-[600px] overflow-y-auto">
                    <div className="prose prose-sm max-w-none">
                        <h1 className="text-2xl font-bold text-slate-900 mb-4">
                            Training Tutorial Preview
                        </h1>

                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                className={`mb-8 pb-6 border-b border-slate-200 last:border-b-0 ${step.id === currentStepId ? 'bg-yellow-50 -mx-4 px-4 py-4 rounded-lg' : ''
                                    }`}
                            >
                                <h2 className="text-lg font-semibold text-slate-800 mb-2">
                                    Step {index + 1}: {step.title || 'Untitled'}
                                </h2>

                                {step.screenshot && (
                                    <div className="my-4 rounded-lg overflow-hidden border border-slate-300">
                                        <img
                                            src={step.screenshot}
                                            alt={step.title}
                                            className="w-full h-auto"
                                        />
                                    </div>
                                )}

                                {step.narration && (
                                    <p className="text-sm text-slate-700 leading-relaxed">
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

            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                <p className="font-medium mb-1">💡 Preview Notes:</p>
                <ul className="space-y-1 ml-4 list-disc">
                    <li>This shows how your document will look in NotebookLM</li>
                    <li>Each step becomes a slide with narration in the video</li>
                    <li>Screenshots will be embedded in the exported document</li>
                </ul>
            </div>
        </div>
    )
}
