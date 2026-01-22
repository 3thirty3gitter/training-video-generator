'use client'

import { TutorialStep } from '@/app/page'
import { Wand2 } from 'lucide-react'

interface StepEditorProps {
    step: TutorialStep
    onUpdate: (updates: Partial<TutorialStep>) => void
    onGenerateNarration: () => void
    isGenerating: boolean
}

export default function StepEditor({
    step,
    onUpdate,
    onGenerateNarration,
    isGenerating
}: StepEditorProps) {
    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Edit Step</h2>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Step Title
                </label>
                <input
                    type="text"
                    value={step.title}
                    onChange={(e) => onUpdate({ title: e.target.value })}
                    placeholder="e.g., Log into the dashboard"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Action/Selector (for automation)
                </label>
                <input
                    type="text"
                    value={step.action}
                    onChange={(e) => onUpdate({ action: e.target.value })}
                    placeholder="e.g., click button[data-login] or navigate to /dashboard"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Use CSS selectors for clicks, or "navigate to [URL]" for navigation
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Wait Time (ms)
                </label>
                <input
                    type="number"
                    value={step.waitTime || 1000}
                    onChange={(e) => onUpdate({ waitTime: parseInt(e.target.value) })}
                    min="500"
                    step="100"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Time to wait after action before screenshot
                </p>
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                        Narration Script
                    </label>
                    <button
                        onClick={onGenerateNarration}
                        disabled={isGenerating || !step.action}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-3 h-3 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Wand2 size={14} />
                                AI Generate
                            </>
                        )}
                    </button>
                </div>
                <textarea
                    value={step.narration}
                    onChange={(e) => onUpdate({ narration: e.target.value })}
                    placeholder="Write what the narrator should say during this step..."
                    rows={8}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                    This will be the voice-over narration in the NotebookLM video
                </p>
            </div>

            {step.screenshot && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Screenshot
                    </label>
                    <div className="relative rounded-lg overflow-hidden border border-slate-300">
                        <img
                            src={step.screenshot}
                            alt={step.title}
                            className="w-full h-auto"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
