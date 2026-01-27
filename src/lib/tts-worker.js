const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs');

// Usage: node tts-worker.js <VOICE_NAME> <OUTPUT_FILE> <SSML_BASE64>

const voiceName = process.argv[2];
const outputFile = process.argv[3];
const ssmlBase64 = process.argv[4];

if (!voiceName || !outputFile || !ssmlBase64) {
    console.error('Usage: node tts-worker.js <VOICE_NAME> <OUTPUT_FILE> <SSML_BASE64>');
    process.exit(1);
}

const ssml = Buffer.from(ssmlBase64, 'base64').toString('utf-8');
const tts = new MsEdgeTTS();

(async () => {
    try {
        await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        const { audioStream } = await tts.toStream(ssml);
        const writeStream = fs.createWriteStream(outputFile);

        audioStream.pipe(writeStream);

        writeStream.on('finish', () => {
            const stats = fs.statSync(outputFile);
            if (stats.size === 0) {
                console.error('Error: Generated file is empty 0kb');
                fs.unlinkSync(outputFile);
                process.exit(1);
            }
            console.log(`Success: ${stats.size} bytes written`);
            process.exit(0);
        });

        writeStream.on('error', (err) => {
            console.error('Stream Error:', err);
            process.exit(1);
        });

    } catch (e) {
        console.error('Worker Error:', e);
        process.exit(1);
    }
})();
