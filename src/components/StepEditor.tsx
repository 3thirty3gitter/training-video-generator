import { useState, useRef } from 'react'
import { TutorialStep } from '@/app/page'
import { Wand2, Mic, Play, Trash2 } from 'lucide-react'
import VoiceOverModal from './VoiceOverModal'

interface StepEditorProps {
    step: TutorialStep
    onUpdate: (updates: Partial<TutorialStep>) => void
    onGenerateNarration: (overrides?: Partial<TutorialStep>) => void
    onReanalyzeVideo?: () => void
    isGenerating: boolean
}

export default function StepEditor({
    step,
    onUpdate,
    onGenerateNarration,
    onReanalyzeVideo,
    isGenerating
}: StepEditorProps) {
    const [isVoiceOverOpen, setIsVoiceOverOpen] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)

    // Helper to upload blob (reused from previous, but now called by modal)
    const uploadAudio = async (blob: Blob) => {
        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', blob)

        try {
            const res = await fetch('/api/upload-audio', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            if (data.success) {
                onUpdate({ customAudioUrl: data.url })
            } else {
                alert('Upload failed: ' + data.error)
            }
        } catch (err) {
            console.error('Upload error', err)
            alert('Failed to upload recording')
        } finally {
            setIsUploading(false)
        }
    }

    const deleteAudio = () => {
        if (confirm('Are you sure you want to delete this recording?')) {
            onUpdate({ customAudioUrl: undefined })
        }
    }

    const captureVideoFrame = (): string | undefined => {
        if (!videoRef.current) return undefined
        try {
            const video = videoRef.current
            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                // Use JPEG with 0.7 quality to keep payload small
                return canvas.toDataURL('image/jpeg', 0.7)
            }
        } catch (e) {
            console.error('Failed to capture video frame', e)
        }
        return undefined
    }

    const handleGenerate = () => {
        let overrides: Partial<TutorialStep> | undefined = undefined

        // If it's a video step and we don't have a visual screenshot yet, try to capture one
        if (step.type === 'video' && step.videoUrl && (!step.screenshot || !step.screenshot.startsWith('data:'))) {
            const frame = captureVideoFrame()
            if (frame) {
                console.log('Captured video frame for AI context')
                // We pass this TEMPORARILY to the AI generator, but don't necessarily save it to the step state
                // to avoid bloating the JSON. Or we could save it. For now, let's pass it as override.
                overrides = { screenshot: frame }
            }
        }
        onGenerateNarration(overrides)
    }

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Edit Step</h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Step Title
                    </label>
                    <input
                        type="text"
                        value={step.title || ''}
                        onChange={(e) => onUpdate({ title: e.target.value })}
                        placeholder="e.g., Log into the dashboard"
                        className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all placeholder-slate-600"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Action/Selector (for automation)
                    </label>
                    <input
                        type="text"
                        value={step.action || ''}
                        onChange={(e) => onUpdate({ action: e.target.value })}
                        placeholder="e.g., click button[data-login] or navigate to /dashboard"
                        className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none font-mono text-sm transition-all placeholder-slate-600"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Use CSS selectors for clicks, or "navigate to [URL]" for navigation
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Wait Time (ms)
                    </label>
                    <input
                        type="number"
                        value={step.waitTime || 1000}
                        onChange={(e) => onUpdate({ waitTime: parseInt(e.target.value) })}
                        min="500"
                        step="100"
                        className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        AI Context / Keywords (Optional)
                    </label>
                    <input
                        type="text"
                        value={step.context || ''}
                        onChange={(e) => onUpdate({ context: e.target.value })}
                        placeholder="e.g., Q3 Sales Dashboard, Login Success Screen"
                        className="w-full px-4 py-2 bg-slate-950/50 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all placeholder-slate-600"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Keywords to help the AI understand what is shown in the video/screenshot.
                    </p>
                </div>
            </div>

            <div className="border-t border-white/10 pt-6">
                <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-slate-300">
                        Narration & Audio
                    </label>
                    <div className="flex items-center gap-2">
                        {step.type === 'video' && step.videoUrl && onReanalyzeVideo && (
                            <button
                                onClick={onReanalyzeVideo}
                                disabled={isGenerating}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-300 bg-amber-900/30 border border-amber-500/20 rounded-lg hover:bg-amber-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Re-analyze video with AI to generate title and narration"
                            >
                                {isGenerating ? (
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Wand2 size={14} />
                                )}
                                Re-analyze Video
                            </button>
                        )}
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || (!step.title?.trim() && !step.action?.trim())}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-300 bg-purple-900/30 border border-purple-500/20 rounded-lg hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title={(!step.title?.trim() && !step.action?.trim()) ? "Add a title or action first" : "Generate narration with AI"}
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Wand2 size={14} />
                                    AI Generate Script
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <textarea
                    value={step.narration || ''}
                    onChange={(e) => onUpdate({ narration: e.target.value })}
                    placeholder="Write what the narrator should say during this step..."
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none resize-none text-sm mb-4 placeholder-slate-600"
                />

                {/* Audio Recording Section */}
                <div className="bg-slate-900/30 rounded-xl p-4 border border-white/5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        Voice Over
                    </label>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsVoiceOverOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 border border-white/5 transition-colors shadow-sm active:scale-95 group"
                        >
                            <Mic size={16} className="text-red-400 group-hover:text-red-300" />
                            <span className="text-sm font-bold">Open Studio</span>
                        </button>

                        {isUploading && (
                            <span className="text-xs text-slate-500 flex items-center gap-2">
                                <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                Uploading logic...
                            </span>
                        )}

                        {step.customAudioUrl && !isUploading && (
                            <div className="flex items-center gap-3 flex-1 bg-slate-800 px-3 py-2 rounded-lg border border-white/5 animate-in fade-in slide-in-from-left-2">
                                <div className="w-8 h-8 bg-purple-900/50 text-purple-400 rounded-full flex items-center justify-center shrink-0">
                                    <Play size={14} className="fill-current" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-slate-200 truncate">Custom Recording</div>
                                    <audio src={step.customAudioUrl} controls className="h-6 w-full max-w-[200px]" />
                                </div>
                                <button
                                    onClick={deleteAudio}
                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Delete recording"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                        If a recording is present, it will override the AI text-to-speech for this step.
                    </p>
                </div>
            </div>

            {(step.screenshot || step.videoUrl) && (
                <div className="border-t border-white/10 pt-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        {step.type === 'video' ? 'Recorded Action (Video)' : 'Step Screenshot'}
                    </label>
                    <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black aspect-video flex items-center justify-center group">
                        {step.type === 'video' && step.videoUrl ? (
                            <video
                                ref={videoRef}
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
                        {step.type === 'video' && (
                            <div className="absolute top-2 right-2">
                                <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg uppercase">
                                    Video Action
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Voice Over Modal */}
            <VoiceOverModal
                isOpen={isVoiceOverOpen}
                onClose={() => setIsVoiceOverOpen(false)}
                step={step}
                onSave={uploadAudio}
            />
        </div>
    )
}
