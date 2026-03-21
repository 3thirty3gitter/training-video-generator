
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import { Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';

const LOG_FILE = path.join(process.cwd(), 'wizard_debug.log')
function debugLog(msg: string) {
    const entry = `[${new Date().toISOString()}] ${msg}\n`
    fs.appendFileSync(LOG_FILE, entry)
    console.log(msg)
}

let currentRecorder: PuppeteerScreenRecorder | null = null;
let currentVideoPath: string | null = null;

// On Vercel, public/ is read-only (deployed artefact). Use /tmp instead.
const IS_VERCEL = !!process.env.VERCEL
const RECORDINGS_DIR = IS_VERCEL
    ? '/tmp/recordings'
    : path.join(process.cwd(), 'public', 'recordings')

export async function startRecording(page: Page): Promise<string> {
    if (currentRecorder) {
        throw new Error('A recording is already in progress');
    }

    if (!fs.existsSync(RECORDINGS_DIR)) {
        fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
    }

    const filename = `recording-${Date.now()}.mp4`;
    const fullPath = path.join(RECORDINGS_DIR, filename);

    const isWin = process.platform === 'win32';
    const ffmpegPath = path.join(
        process.cwd(),
        'node_modules',
        '@ffmpeg-installer',
        isWin ? 'win32-x64' : 'linux-x64',
        isWin ? 'ffmpeg.exe' : 'ffmpeg'
    );

    debugLog(`[Video] Using FFmpeg at: ${ffmpegPath}`);
    if (!fs.existsSync(ffmpegPath)) {
        debugLog(`[Video] FFmpeg NOT FOUND at: ${ffmpegPath}`);
    }

    // Config for high quality but reasonable size
    const Config = {
        followNewTab: true,
        fps: 20,
        ffmpeg_Path: ffmpegPath, // Use the local ffmpeg binary
        videoFrame: {
            width: 1280,
            height: 720,
        },
        aspectRatio: '16:9',
    };

    currentRecorder = new PuppeteerScreenRecorder(page, Config);
    currentVideoPath = fullPath;

    console.log(`[Video] Starting recording: ${fullPath}`);
    await currentRecorder.start(fullPath);

    // On Vercel /tmp isn't served statically — recordings are accessed via API route
    const webPath = IS_VERCEL ? `/api/recordings/${filename}` : `/recordings/${filename}`
    return webPath;
}

export async function stopRecording(): Promise<string> {
    if (!currentRecorder) {
        console.warn('[Video] stopRecording called but no recording in progress. Ignoring.');
        return currentVideoPath || ''; // Return last path if available, or empty
    }

    console.log('[Video] Stopping recording...');
    await currentRecorder.stop();

    const savedPath = currentVideoPath;
    currentRecorder = null;
    currentVideoPath = null;

    if (!savedPath) {
        console.error('Video path lost during recording');
        return '';
    }

    console.log(`[Video] Recording saved to: ${savedPath}`);
    return savedPath;
}

export function isRecording(): boolean {
    return !!currentRecorder;
}
