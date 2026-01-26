import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { TutorialStep } from '@/app/page';

// Resolve ffmpeg path manually like we did in video-recorder
const isWin = process.platform === 'win32';
const ffmpegPath = path.join(
    process.cwd(),
    'node_modules',
    '@ffmpeg-installer',
    isWin ? 'win32-x64' : 'linux-x64',
    isWin ? 'ffmpeg.exe' : 'ffmpeg'
);
ffmpeg.setFfmpegPath(ffmpegPath);

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'exports', 'videos');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

export async function stitchTutorialVideo(projectName: string, steps: TutorialStep[], audioPaths: string[]): Promise<string> {
    const timestamp = Date.now();
    const outputFilename = `tutorial-${timestamp}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    console.log(`[Stitcher] Starting stitch for ${projectName}...`);

    return new Promise((resolve, reject) => {
        const command = ffmpeg();

        // TEMPORARY: For the initial version, we'll just stitch the first few clips to verify logic
        // Real logic needs to handle complex concatenation of dynamic files

        // We'll use a "concat" filter or complex filtergraph
        // For simplicity in this first version, let's just process sequentially or use a list file

        const concatFile = path.join(process.cwd(), `concat-${timestamp}.txt`);
        let concatContent = '';

        // Optimization: Convert everything to a standard format (1080p, 30fps)
        // This is complex for a one-shot tool call, so I'll implement a robust sequential processor

        processSteps(steps, audioPaths, outputPath)
            .then(resolve)
            .catch(reject);
    });
}

// A more robust sequential approach for complex stitching
async function processSteps(steps: TutorialStep[], audioPaths: string[], outputPath: string): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp_stitch');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const processedClips: string[] = [];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const audioPath = audioPaths[i];
        const clipOutputPath = path.join(tempDir, `clip-${i}.mp4`);

        console.log(`[Stitcher] Processing Step ${i + 1}/${steps.length}...`);

        await new Promise((resolve, reject) => {
            let cmd = ffmpeg();

            if (step.type === 'video' && step.videoUrl) {
                // If it's a video, we need to loop/stretch it or just overlay audio
                // Convert URL to absolute path if needed
                const videoPath = step.videoUrl.startsWith('http')
                    ? path.join(process.cwd(), 'public', step.videoUrl.replace(/^\//, ''))
                    : step.videoUrl;

                cmd = cmd.input(videoPath);
            } else if (step.screenshot) {
                // If its an image, create a slide
                const imgPath = step.screenshot.startsWith('data:')
                    ? saveBase64Image(step.screenshot, i, tempDir)
                    : path.join(process.cwd(), 'public', step.screenshot.replace(/^\//, ''));

                cmd = cmd.input(imgPath).loop(3); // Default 3s for images
            }

            // Add the audio
            if (audioPath) {
                cmd = cmd.input(audioPath);
            }

            cmd
                .outputOptions([
                    '-c:v libx264',
                    '-preset fast',
                    '-pix_fmt yuv420p',
                    '-vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
                    '-shortest' // Stop video when audio ends (or vice-versa, usually audio is limiting for images)
                ])
                .on('error', reject)
                .on('end', resolve)
                .save(clipOutputPath);
        });

        processedClips.push(clipOutputPath);
    }

    // Now concatenate all clips
    return new Promise((resolve, reject) => {
        let finalCmd = ffmpeg();
        processedClips.forEach(clip => finalCmd = finalCmd.input(clip));

        finalCmd
            .on('error', reject)
            .on('end', () => {
                // Cleanup temp
                // fs.rmSync(tempDir, { recursive: true, force: true });
                resolve(`/exports/videos/${path.basename(outputPath)}`);
            })
            .mergeToFile(outputPath, tempDir);
    });
}

function saveBase64Image(base64: string, index: number, dir: string): string {
    const data = base64.replace(/^data:image\/\w+;base64,/, '');
    const filePath = path.join(dir, `temp-img-${index}.png`);
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    return filePath;
}
