import * as googleTTS from 'google-tts-api';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { exec } from 'child_process';
import { promisify } from 'util';
import ffmpeg from 'fluent-ffmpeg';
import { getFfmpegPath, getFfprobePath } from '@/lib/paths';

const execAsync = promisify(exec);

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio', 'narration');
const KOKORO_SCRIPT = path.join(process.cwd(), 'generate_kokoro.py');

if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// FFmpeg Setup
ffmpeg.setFfmpegPath(getFfmpegPath());
ffmpeg.setFfprobePath(getFfprobePath());

// Character Definitions (Simulated via DSP)
// We map these IDs to: Accent (TLD) + Pitch Shift + EQ
interface CharacterProfile {
    tld: string;
    pitch: number; // 1.0 = normal
    eq: 'none' | 'deep' | 'bright' | 'sharp';
}

const CHARACTERS: Record<string, CharacterProfile> = {
    // US Voices
    'us-aria': { tld: 'com', pitch: 1.0, eq: 'none' }, // Standard
    'us-guy': { tld: 'com', pitch: 0.9, eq: 'none' }, // Slightly deeper
    'us-jenny': { tld: 'com', pitch: 1.1, eq: 'bright' }, // Higher, brighter
    'us-christopher': { tld: 'com', pitch: 0.85, eq: 'deep' }, // Deep, serious
    'us-eric': { tld: 'com', pitch: 0.95, eq: 'sharp' }, // Business
    'us-michelle': { tld: 'com', pitch: 1.05, eq: 'none' }, // Warm
    'us-roger': { tld: 'com', pitch: 0.8, eq: 'deep' }, // Authoritative

    // UK Voices
    'uk-sonia': { tld: 'co.uk', pitch: 1.0, eq: 'none' },
    'uk-ryan': { tld: 'co.uk', pitch: 0.9, eq: 'none' },
    'uk-libby': { tld: 'co.uk', pitch: 1.1, eq: 'bright' },
    'uk-abbi': { tld: 'co.uk', pitch: 0.85, eq: 'deep' },

    // Others
    'au-natasha': { tld: 'com.au', pitch: 1.0, eq: 'bright' },
    'au-william': { tld: 'com.au', pitch: 0.9, eq: 'deep' },
    'in-neerja': { tld: 'co.in', pitch: 1.05, eq: 'bright' },
    'in-prabhat': { tld: 'co.in', pitch: 0.9, eq: 'deep' },

    // Default
    'default': { tld: 'com', pitch: 1.0, eq: 'none' }

};

const KOKORO_VOICES: Record<string, string> = {
    'kokoro-af_sarah': 'af_sarah', // US Female
    'kokoro-af_nicole': 'af_nicole', // US Female
    'kokoro-af_bella': 'af_bella', // US Female
    'kokoro-am_michael': 'am_michael', // US Male
    'kokoro-am_adam': 'am_adam', // US Male
    'kokoro-bf_emma': 'bf_emma', // UK Female
    'kokoro-bm_george': 'bm_george', // UK Male
};

async function generateKokoroAudio(id: string, text: string, voiceId: string, speed: number = 1, style: string = 'normal'): Promise<string> {
    const kokoroVoice = KOKORO_VOICES[voiceId];
    if (!kokoroVoice) throw new Error(`Unknown Kokoro voice: ${voiceId}`);

    // Output file path
    const finalMp3Path = path.join(AUDIO_DIR, `narration-${id}-${voiceId}-${style}-${speed.toString().replace('.', '_')}.mp3`);

    // Check cache
    if (fs.existsSync(finalMp3Path) && fs.statSync(finalMp3Path).size > 0) {
        return finalMp3Path;
    }

    const tempWavPath = path.join(AUDIO_DIR, `temp-kokoro-${id}.wav`);

    try {
        // Run Python Script
        // python generate_kokoro.py --text "..." --voice "..." --speed ... --output_file "..."

        // Escape quotes to be safe (simple check)
        const safeText = text.replace(/"/g, '\\"');

        const cmd = `python "${KOKORO_SCRIPT}" --text "${safeText}" --voice "${kokoroVoice}" --speed ${speed} --output_file "${tempWavPath}"`;
        console.log(`[Kokoro] Executing: ${cmd}`);

        await execAsync(cmd);

        if (!fs.existsSync(tempWavPath) || fs.statSync(tempWavPath).size === 0) {
            throw new Error('Kokoro failed to generate audio (empty or missing wav)');
        }

        // Convert to MP3
        await new Promise<void>((resolve, reject) => {
            ffmpeg(tempWavPath)
                .toFormat('mp3')
                .save(finalMp3Path)
                .on('end', () => resolve())
                .on('error', (err: any) => reject(err));
        });

        return finalMp3Path;

    } catch (error) {
        console.error('Kokoro TTS Error:', error);
        throw error;
    } finally {
        if (fs.existsSync(tempWavPath)) fs.unlinkSync(tempWavPath);
    }
}

export async function generateNarrationAudio(id: string, text: string, characterId: string = 'com', style: string = 'normal', speed: number = 1): Promise<string> {
    const speedStr = speed.toString().replace('.', '_');
    const filename = `narration-${id}-${characterId}-${style}-${speedStr}.mp3`;
    const finalFilePath = path.join(AUDIO_DIR, filename);

    // Cache Check
    if (fs.existsSync(finalFilePath)) {
        const stats = fs.statSync(finalFilePath);
        if (stats.size > 0) return finalFilePath;
        try { fs.unlinkSync(finalFilePath); } catch (e) { }
    }

    console.log(`[TTS] Generating: ${id}, Char=${characterId}, Style=${style}, Speed=${speed}`);

    // CHECK FOR KOKORO VOICE
    if (characterId.startsWith('kokoro-')) {
        try {
            return await generateKokoroAudio(id, text, characterId, speed, style);
        } catch (error) {
            console.error('[TTS] Kokoro failed, falling back to Google DSP:', error);
            // Fallback: use default Google voice but keep requested speed/style logic (best effort)
            characterId = 'us-aria';
        }
    }

    // Google DSP Logic
    // 1. Get Character Settings
    const charProfile = CHARACTERS[characterId] || CHARACTERS[characterId.replace('com', 'us-aria')] || CHARACTERS['default']; // Handle legacy 'com' maps if needed

    // Legacy Accent Map fallback
    if (characterId === 'com') charProfile.tld = 'com';
    if (characterId === 'co.uk') charProfile.tld = 'co.uk';

    // 2. Download Raw Audio (Google TTS)
    const host = `https://translate.google.${charProfile.tld}`;
    const safeText = text.substring(0, 199);
    const url = googleTTS.getAudioUrl(safeText, { lang: 'en', slow: false, host: host });

    const tempRawPath = path.join(AUDIO_DIR, `temp-${id}-${Date.now()}.mp3`);

    await new Promise<void>((resolve, reject) => {
        const file = fs.createWriteStream(tempRawPath);
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                fs.unlink(tempRawPath, () => { });
                reject(new Error(`Google TTS Failed: ${res.statusCode}`));
                return;
            }
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
        }).on('error', (e) => {
            fs.unlink(tempRawPath, () => { });
            reject(e);
        });
    });

    // 3. Probe Sample Rate (Crucial for Pitch Shift)
    const sampleRate = await new Promise<number>((resolve) => {
        ffmpeg.ffprobe(tempRawPath, (err: any, metadata: any) => {
            if (err) resolve(24000); // Fail-safe default
            else resolve(metadata.streams[0].sample_rate || 24000);
        });
    });

    // 4. Build Filters
    let filters: string[] = [];

    // Base Pitch from Character
    let pitch = charProfile.pitch;

    // Style Modifications
    if (style.startsWith('cheerful')) pitch *= 1.05; // Slightly higher
    if (style.startsWith('serious')) pitch *= 0.95; // Slightly lower

    // Apply Pitch Shift (using Sample Rate trick)
    // asetrate = rate * pitch
    // atempo = 1 / pitch (to correct speed change caused by rate change)
    if (pitch !== 1.0) {
        filters.push(`aresample=${sampleRate}`);
        filters.push(`asetrate=${sampleRate * pitch}`);
        filters.push(`atempo=${1 / pitch}`);
    }

    // Apply EQ
    if (charProfile.eq === 'bright') filters.push('treble=g=3');
    if (charProfile.eq === 'deep') filters.push('bass=g=3');
    if (charProfile.eq === 'sharp') filters.push('treble=g=5');

    // Apply User Speed
    if (speed !== 1) {
        filters.push(`atempo=${speed}`);
    }

    // Style Speed Mods
    if (style.startsWith('cheerful') && speed === 1) filters.push('atempo=1.1');
    if (style.startsWith('serious') && speed === 1) filters.push('atempo=0.9');

    // If no filters needed, just rename
    if (filters.length === 0) {
        fs.renameSync(tempRawPath, finalFilePath);
        return finalFilePath;
    }

    // 5. Process
    return new Promise((resolve, reject) => {
        ffmpeg(tempRawPath)
            .audioFilters(filters)
            .save(finalFilePath)
            .on('end', () => {
                fs.unlinkSync(tempRawPath);
                resolve(finalFilePath);
            })
            .on('error', (err: any) => {
                console.error('DSP Processing Error:', err);
                // Fallback to raw
                fs.renameSync(tempRawPath, finalFilePath);
                resolve(finalFilePath);
            });
    });
}
