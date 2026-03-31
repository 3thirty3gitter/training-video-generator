import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { TutorialStep } from '@/app/page';
import { getFfmpegPath, getFfprobePath } from '@/lib/paths';

// FFmpeg Setup
ffmpeg.setFfmpegPath(getFfmpegPath());
ffmpeg.setFfprobePath(getFfprobePath());

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'exports', 'videos');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

export async function stitchTutorialVideo(
    projectName: string,
    steps: TutorialStep[],
    audioPaths: string[],
    includeCaptions: boolean = false,
    transitionType: 'none' | 'fade' = 'none',
    backgroundMusic: string = 'none',
    musicVolume: number = 0.1
): Promise<string> {
    const timestamp = Date.now();
    const outputFilename = `tutorial-${timestamp}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    console.log(`[Stitcher] Starting stitch for ${projectName} (Captions: ${includeCaptions}, Music: ${backgroundMusic})...`);

    return new Promise((resolve, reject) => {
        // ... (preamble)
        processSteps(steps, audioPaths, outputPath, includeCaptions, transitionType, backgroundMusic, musicVolume)
            .then(resolve)
            .catch(reject);
    });
}

// A more robust sequential approach for complex stitching
async function processSteps(
    steps: TutorialStep[],
    audioPaths: string[],
    outputPath: string,
    includeCaptions: boolean,
    transitionType: 'none' | 'fade',
    backgroundMusic: string,
    musicVolume: number
): Promise<string> {
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
                let videoPath = step.videoUrl;

                // If it's a local path (starts with /) or relative, resolve to public dir
                if (!videoPath.startsWith('http') && !videoPath.match(/^[a-zA-Z]:\\/)) {
                    videoPath = path.join(process.cwd(), 'public', step.videoUrl.replace(/^\//, ''));
                }

                if (!fs.existsSync(videoPath)) {
                    console.error(`[Stitcher] Video file not found: ${videoPath}`);
                    reject(new Error(`Video file not found: ${videoPath}`));
                    return;
                }

                cmd = cmd.input(videoPath);
            } else if (step.screenshot) {
                // If its an image, create a slide
                const imgPath = step.screenshot.startsWith('data:')
                    ? saveBase64Image(step.screenshot, i, tempDir)
                    : path.join(process.cwd(), 'public', step.screenshot.replace(/^\//, ''));

                cmd = cmd.input(imgPath).inputOptions('-loop 1');
            }

            // Add the audio
            if (audioPath) {
                cmd = cmd.input(audioPath);
            } else if (step.screenshot) {
                // If it's an image and no audio, default to 3 seconds
                cmd = cmd.duration(3);
            }

            // Calculate expected duration for fades
            let duration = 3; // Default for image
            if (audioPath) {
                // We need to wait for probe to get duration
                // Changing this strictly inside the promise is tricky with async probe.
                // Refactoring so we get duration BEFORE creating the ffmpeg command.
                // BUT, since we are inside a promise executor, we can't easily await.
                // So we will do the probe outside or handle it differently.
                // ACTUALLY, we can just chain it.
            }

            // RE-WRITING LOGIC TO BE ASYNC FRIENDLY
            const run = async () => {
                if (audioPath) {
                    try {
                        duration = await getAudioDurationInSeconds(audioPath);
                    } catch (e) {
                        console.error('Failed to probe audio duration, defaulting to no fade out', e);
                    }
                }

                // Build Filters
                let filters: string[] = [
                    'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2'
                ];

                // Add Transition Filters (Fade In/Out)
                if (transitionType === 'fade') {
                    // Fade In (always safe) - 0.5s black to video
                    filters[0] += `,fade=t=in:st=0:d=0.5`;

                    // Fade Out (only if we know duration)
                    if (duration > 1.0) {
                        // Fade to black at the end
                        filters[0] += `,fade=t=out:st=${duration - 0.5}:d=0.5`;
                    }
                }

                // Add Captions Filter
                if (includeCaptions && step.narration) {
                    // Create a temp text file to avoid huge command lines / escaping hell
                    const textFilePath = path.join(tempDir, `caption-${i}.txt`);
                    // Split long text into multiple lines for basic wrapping (naive)
                    const safeText = chunkString(step.narration, 60).join('\n');
                    fs.writeFileSync(textFilePath, safeText, 'utf8');

                    // Escape path for ffmpeg filter: replace backslashes with forward slashes, escape colon
                    // Windows path handling in filters is notoriously tricky.
                    // Safest bet: relative path or forward slashes.
                    const safePath = textFilePath.replace(/\\/g, '/').replace(':', '\\:');

                    // drawtext filter
                    // fontsize=48, white text, black box with 50% opacity, bottom centered
                    // y=h-(h/5) places it 20% from bottom
                    filters[0] += `,drawtext=textfile='${safePath}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.6:boxborderw=20:x=(w-text_w)/2:y=h-(h/6)`;
                }

                cmd
                    .outputOptions([
                        '-c:v libx264',
                        '-preset fast',
                        '-pix_fmt yuv420p',
                        `-vf ${filters.join(',')}`,
                        '-shortest' // Stop video when audio ends
                    ])
                    .on('error', reject)
                    .on('end', resolve)
                    .save(clipOutputPath);
            };

            run();
        });

        processedClips.push(clipOutputPath);
    }

    // Now concatenate all clips
    // Now concatenate all clips
    return new Promise((resolve, reject) => {
        // First, merge the visual/narration clips into a single intermediate file
        const intermediatePath = path.join(tempDir, 'intermediate_stitch.mp4');

        let mergeCmd = ffmpeg();
        processedClips.forEach(clip => mergeCmd = mergeCmd.input(clip));

        mergeCmd
            .on('error', (err) => {
                console.error('[Stitcher] Merge failed:', err);
                reject(err);
            })
            .on('end', async () => {
                // If no music, we are done (just rename/move intermediate to final)
                if (backgroundMusic === 'none' || !backgroundMusic) {
                    // Since we can't easily rename across partitions potentially, let's copy or just use the intermediate
                    // Actually, mergeToFile outputs to intermediatePath.
                    // We need to move it to outputPath.
                    fs.copyFileSync(intermediatePath, outputPath);
                    resolve(`/exports/videos/${path.basename(outputPath)}`);
                    return;
                }

                // If WE HAVE MUSIC, we need a second pass to mix it in.
                // 1. Resolve Music Path
                const musicMap: Record<string, string> = {
                    'upbeat': 'upbeat.mp3',
                    'lofi': 'lofi.mp3',
                    'cinematic': 'cinematic.mp3',
                    'modern': 'modern.mp3',
                    'piano': 'piano.mp3',
                    'groove': 'groove.mp3'
                };

                const musicFilename = musicMap[backgroundMusic];
                const musicPath = path.join(process.cwd(), 'public', 'music', musicFilename);

                if (!fs.existsSync(musicPath)) {
                    console.warn(`[Stitcher] Music file not found: ${musicPath}, skipping music.`);
                    fs.copyFileSync(intermediatePath, outputPath);
                    resolve(`/exports/videos/${path.basename(outputPath)}`);
                    return;
                }

                console.log(`[Stitcher] Mixing background music: ${musicFilename} at vol ${musicVolume}`);

                // 2. Mix
                ffmpeg()
                    .input(intermediatePath)
                    .input(musicPath)
                    .inputOptions([
                        '-stream_loop -1' // Loop music indefinitely
                    ])
                    .complexFilter([
                        `[1:a]volume=${musicVolume}[music]`,   // Lower music volume
                        `[0:a][music]amix=inputs=2:duration=first[aout]` // Mix, duration determined by video
                    ])
                    .outputOptions([
                        '-map 0:v',      // Keep original video
                        '-map [aout]',   // Use mixed audio
                        '-c:v copy',     // Copy video codec (fast)
                        '-c:a aac',      // Re-encode audio
                        '-shortest'      // Cut when shortest input ends (video)
                    ])
                    .save(outputPath)
                    .on('error', (err) => {
                        console.error('[Stitcher] Music mix failed:', err);
                        reject(err);
                    })
                    .on('end', () => {
                        resolve(`/exports/videos/${path.basename(outputPath)}`);
                    });

            })
            .mergeToFile(intermediatePath, tempDir);
    });
}

function getAudioDurationInSeconds(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata.format.duration || 0);
        });
    });
}

function chunkString(str: string, length: number) {
    return str.match(new RegExp('.{1,' + length + '}', 'g')) || [];
}

function saveBase64Image(base64: string, index: number, dir: string): string {
    const data = base64.replace(/^data:image\/\w+;base64,/, '');
    const filePath = path.join(dir, `temp-img-${index}.png`);
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    return filePath;
}
