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
 * Honors the FFMPEG_PATH env var (e.g. system ffmpeg in Docker),
 * otherwise falls back to the npm-installed binary.
 */
export function getFfmpegPath(): string {
    if (process.env.FFMPEG_PATH) {
        return process.env.FFMPEG_PATH;
    }
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
 * Honors the FFPROBE_PATH env var (e.g. system ffprobe in Docker),
 * otherwise falls back to the npm-installed binary.
 */
export function getFfprobePath(): string {
    if (process.env.FFPROBE_PATH) {
        return process.env.FFPROBE_PATH;
    }
    return path.join(
        getAppRoot(),
        'node_modules',
        '@ffprobe-installer',
        isWin ? 'win32-x64' : 'linux-x64',
        isWin ? 'ffprobe.exe' : 'ffprobe'
    );
}
