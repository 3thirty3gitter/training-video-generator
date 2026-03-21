/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
        // Next.js 14: serverExternalPackages lives under experimental
        serverComponentsExternalPackages: [
            'puppeteer',
            'puppeteer-core',
            '@sparticuz/chromium',
            'puppeteer-screen-recorder',
            'fluent-ffmpeg',
            '@ffmpeg-installer/ffmpeg',
            '@ffprobe-installer/ffprobe',
            'docx',
            'msedge-tts',
            'google-tts-api',
            'kokoro-js',
            '@xenova/transformers',
            'firebase-admin',
        ],
    },
}

module.exports = nextConfig
