import { NextRequest, NextResponse } from 'next/server'
import { generateNarrationAudio } from '@/lib/tts-engine'

export async function POST(request: NextRequest) {
    try {
        const { voice, voiceStyle, voiceSpeed } = await request.json();
        const tld = voice || 'com';
        const style = voiceStyle || 'normal';
        const speed = voiceSpeed || 1;

        // Use a standard sample text
        const text = "Hello! This is a sample of how I sound with this accent.";

        // Generate (or retrieve cached) audio
        // Force new generation for previews to ensure we hear the change
        const timestamp = Date.now();
        const filePath = await generateNarrationAudio(`preview-${timestamp}`, text, tld, style, speed);

        // Convert filesystem path to public URL
        // filePath is like .../public/audio/narration/narration-preview-com.mp3
        // We want /audio/narration/narration-preview-com.mp3
        const fileName = filePath.split(/[\\/]/).pop();
        const publicUrl = `/audio/narration/${fileName}`;

        return NextResponse.json({
            success: true,
            audioUrl: publicUrl
        });

    } catch (error) {
        console.error('[Voice-Preview] Failed:', error)
        return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 })
    }
}
