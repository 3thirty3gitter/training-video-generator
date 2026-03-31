import path from 'path';

const isWin = process.platform === 'win32';

/**
 * Get the application root directory.
 * Works in both Next.js dev and packaged Electron.
 */
export function getAppRoot(): string {
    return process.cwd();
}

/**
 * Resolve the FFmpeg binary path.
 */
export function getFfmpegPath(): string {
    return path.join(
        getAppRoot(),
        'node_modules',
        '@ffmpeg-installer',
        isWin ? 'win32-x64' : 'linux-x64',
        isWin ? 'ffmpeg.exe' : 'ffmpeg'
    );
}

/**
 * Resolve the FFprobe binary path.
 */
export function getFfprobePath(): string {
    return path.join(
        getAppRoot(),
        'node_modules',
        '@ffprobe-installer',
        isWin ? 'win32-x64' : 'linux-x64',
        isWin ? 'ffprobe.exe' : 'ffprobe'
    );
}
