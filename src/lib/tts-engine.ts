import * as googleTTS from 'google-tts-api';
import fs from 'fs';
import path from 'path';
import https from 'https';

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio', 'narration');

if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

export async function generateNarrationAudio(id: string, text: string): Promise<string> {
    const filename = `narration-${id}.mp3`;
    const filePath = path.join(AUDIO_DIR, filename);

    // If it already exists, reuse it to save bandwidth/time
    if (fs.existsSync(filePath)) {
        return filePath;
    }

    const url = googleTTS.getAudioUrl(text, {
        lang: 'en',
        slow: false,
        host: 'https://translate.google.com',
    });

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(filePath);
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => { });
            reject(err);
        });
    });
}
