
'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Mic, Square, Play, Save, RotateCcw, AlertCircle, Type } from 'lucide-react'
import { TutorialStep } from '@/app/page'

interface VoiceOverModalProps {
    isOpen: boolean
    onClose: () => void
    step: TutorialStep
    onSave: (blob: Blob) => Promise<void>
}

export default function VoiceOverModal({ isOpen, onClose, step, onSave }: VoiceOverModalProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isPlayingReview, setIsPlayingReview] = useState(false)
    const [duration, setDuration] = useState(0)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const videoRef = useRef<HTMLVideoElement>(null)
    const audioRef = useRef<HTMLAudioElement>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    // Cleanup on unmount or close
    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
        }
        setIsRecording(false)
        if (videoRef.current) {
            videoRef.current.pause()
        }
    }

    // Cleanup on unmount or close -- MOVED AFTER function definition
    useEffect(() => {
        if (!isOpen) {
            stopRecording()
            if (audioUrl) URL.revokeObjectURL(audioUrl)
            setAudioBlob(null)
            setAudioUrl(null)
            setDuration(0)
        }
    }, [isOpen])

    // Timer logic
    useEffect(() => {
        if (isRecording) {
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1)
            }, 1000)
        } else {
            if (timerRef.current) clearInterval(timerRef.current)
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [isRecording])

    if (!isOpen) return null

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaRecorderRef.current = new MediaRecorder(stream)
            chunksRef.current = []

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
                setAudioBlob(blob)
                setAudioUrl(URL.createObjectURL(blob))

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorderRef.current.start()
            setIsRecording(true)
            setAudioBlob(null)
            setDuration(0)

            // Auto-play video if available
            if (videoRef.current) {
                videoRef.current.currentTime = 0
                videoRef.current.play()
                videoRef.current.loop = false // Don't loop while recording, confusing
                // Optional: Stop recording when video ends?
                // videoRef.current.onended = () => stopRecording() 
                // Let's keep manual stop for flexibility (e.g. extending narration past video)
            }

        } catch (err) {
            console.error('Failed to start recording', err)
            alert('Could not access microphone. Please allow access.')
        }
    }



    const playReview = () => {
        if (!audioUrl) return

        setIsPlayingReview(true)

        // Synced start
        if (audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play()
            audioRef.current.onended = () => setIsPlayingReview(false)
        }

        if (videoRef.current) {
            videoRef.current.currentTime = 0
            videoRef.current.play()
        }
    }

    const stopReview = () => {
        setIsPlayingReview(false)
        if (audioRef.current) audioRef.current.pause()
        if (videoRef.current) videoRef.current.pause()
    }

    const handleSave = async () => {
        if (!audioBlob) return
        setIsSaving(true)
        try {
            await onSave(audioBlob)
            onClose()
        } catch (e) {
            console.error(e)
            alert('Failed to save recording')
        } finally {
            setIsSaving(false)
        }
    }

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60)
        const s = secs % 60
        return `${mins}:${s.toString().padStart(2, '0')}`
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 ring-1 ring-white/5 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-transparent">
                    <div>
                        <h3 className="font-bold text-lg text-white">Voice Over Studio</h3>
                        <p className="text-xs text-slate-400 font-medium truncate max-w-md">
                            {step.title || 'Untitled Step'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content (Preview) */}
                <div className="flex-1 bg-black relative flex items-center justify-center min-h-[400px]">
                    {step.type === 'video' && step.videoUrl ? (
                        <video
                            ref={videoRef}
                            src={step.videoUrl}
                            className="max-h-full max-w-full object-contain"
                            muted // Mute video audio so we hear the voice over clearly (or allow mixing later)
                            playsInline
                        />
                    ) : (
                        <img
                            src={step.screenshot}
                            alt="Step preview"
                            className="max-h-full max-w-full object-contain"
                        />
                    )}

                    {/* Recording Indicator */}
                    {isRecording && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600/90 text-white px-3 py-1.5 rounded-full backdrop-blur text-sm font-bold shadow-lg animate-pulse">
                            <div className="w-2.5 h-2.5 bg-white rounded-full" />
                            RECORDING {formatTime(duration)}
                        </div>
                    )}
                </div>

                {/* Preview Audio Element (Hidden) */}
                {audioUrl && <audio ref={audioRef} src={audioUrl} />}

                {/* Controls */}
                <div className="p-6 bg-slate-900/50 border-t border-white/5">
                    <div className="flex items-center justify-between max-w-2xl mx-auto">

                        {/* Left: Retake/Clear */}
                        <div className="w-24">
                            {audioBlob && !isRecording && (
                                <button
                                    onClick={() => { setAudioBlob(null); setDuration(0); }}
                                    className="flex flex-col items-center gap-1 text-slate-400 hover:text-red-500 transition-colors text-xs font-medium"
                                >
                                    <RotateCcw size={20} />
                                    Retake
                                </button>
                            )}
                        </div>

                        {/* Center: Rec/Play Controls */}
                        <div className="flex items-center gap-6">
                            {!isRecording ? (
                                <>
                                    {audioBlob ? (
                                        <button
                                            onClick={isPlayingReview ? stopReview : playReview}
                                            className="w-16 h-16 rounded-full flex items-center justify-center bg-purple-100 text-purple-600 hover:bg-purple-200 transition-all shadow-sm"
                                        >
                                            {isPlayingReview ? <Square size={24} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={startRecording}
                                            className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg hover:shadow-red-200 hover:scale-105 active:scale-95 group"
                                        >
                                            <Mic size={28} className="group-hover:scale-110 transition-transform" />
                                        </button>
                                    )}
                                </>
                            ) : (
                                <button
                                    onClick={stopRecording}
                                    className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-700 text-white hover:bg-slate-600 transition-all shadow-lg active:scale-95 border border-white/10"
                                >
                                    <Square size={24} fill="currentColor" />
                                </button>
                            )}
                        </div>

                        {/* Right: Save */}
                        <div className="w-24 flex justify-end">
                            {audioBlob && !isRecording && (
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 active:scale-95 disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Save size={18} />
                                    )}
                                    Save
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Script Prompt (Teleprompter Style) */}
                    <div className="mt-6">
                        <div className="flex items-center gap-2 mb-2 justify-center">
                            <Type size={14} className="text-purple-400" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Teleprompter</span>
                        </div>
                        <div className="bg-black/40 rounded-xl border border-white/5 p-6 max-h-[150px] overflow-y-auto text-center relative group">
                            {step.narration ? (
                                <p className="text-2xl font-semibold text-white/90 leading-relaxed font-sans shadow-black drop-shadow-md">
                                    {step.narration}
                                </p>
                            ) : (
                                <p className="text-slate-500 italic text-sm">
                                    No script generated. Use the "AI Generate Script" button in the editor first.
                                </p>
                            )}
                            {/* Fade overlay for scroll suggestion */}
                            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-900/10 to-transparent pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
