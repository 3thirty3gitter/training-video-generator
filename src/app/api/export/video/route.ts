import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { generateNarrationAudio } from '@/lib/tts-engine'
import { stitchTutorialVideo } from '@/lib/video-stitcher'

const STORAGE_PATH = path.join(process.cwd(), 'project_data.json')

export async function POST(request: NextRequest) {
    try {
        if (!fs.existsSync(STORAGE_PATH)) {
            return NextResponse.json({ error: 'No project data found' }, { status: 404 })
        }

        const projectData = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf-8'));
        const steps = projectData.steps || [];

        if (steps.length === 0) {
            return NextResponse.json({ error: 'Project has no steps to render' }, { status: 400 })
        }

        console.log(`[Export-Video] Rendering tutorial with ${steps.length} steps...`);

        // 1. Generate Audio for all steps
        const audioPaths: string[] = [];
        const voiceTld = projectData.voice || 'com';
        const voiceStyle = projectData.voiceStyle || 'normal';
        const voiceSpeed = projectData.voiceSpeed || 1;
        console.log(`[Export-Video] Using Voice: ${voiceTld}, Style: ${voiceStyle}, Speed: ${voiceSpeed}`);

        for (const step of steps) {
            let audioPath = '';

            // 1. Check for Custom Recording first
            if (step.customAudioUrl) {
                const relativePath = step.customAudioUrl.replace(/^\//, '');
                const absolutePath = path.join(process.cwd(), 'public', relativePath);

                if (fs.existsSync(absolutePath)) {
                    console.log(`[Export-Video] Using Custom Audio for: ${step.title}`);
                    audioPath = absolutePath;
                } else {
                    console.warn(`[Export-Video] Custom audio file missing: ${absolutePath}`);
                }
            }

            // 2. Fallback to TTS if no custom audio
            if (!audioPath && step.narration) {
                console.log(`[Export-Video] Generating TTS for: ${step.title}`);
                audioPath = await generateNarrationAudio(step.id, step.narration, voiceTld, voiceStyle, voiceSpeed);
            }

            audioPaths.push(audioPath || '');
        }

        // 2. Stitch Video
        console.log(`[Export-Video] Stitching clips...`);
        const finalVideoUrl = await stitchTutorialVideo(
            projectData.projectName || 'Training Tutorial',
            steps,
            audioPaths,
            projectData.includeCaptions || false,
            projectData.transition || 'none',
            projectData.backgroundMusic || 'none',
            projectData.musicVolume || 0.1
        );

        console.log(`[Export-Video] Render complete: ${finalVideoUrl}`);

        return NextResponse.json({
            success: true,
            videoUrl: finalVideoUrl,
            message: 'Tutorial video rendered successfully!'
        });

    } catch (error) {
        console.error('[Export-Video] Render failed:', error)
        return NextResponse.json({ error: 'Failed to render tutorial video' }, { status: 500 })
    }
}
