
import { stopRecording } from '@/lib/video-recorder'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server'
import path from 'path'
import fs from 'fs'

export async function processAndAnalyzeVideo(pageTitle?: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error('Missing Gemini API Key');
    }

    // 0. Remove Timer Overlay if it exists
    try {
        const { getBrowserSession } = await import('@/lib/browser-session');
        const browser = await getBrowserSession();
        if (browser) {
            const pages = await browser.pages();
            const activePage = pages[pages.length - 1];
            if (activePage) {
                await activePage.evaluate(() => {
                    if ((window as any)._recTimer) clearInterval((window as any)._recTimer);
                    if ((window as any)._originalTitle) document.title = (window as any)._originalTitle;
                });
            }
        }
    } catch (e) { /* ignore cleanup error */ }

    // 1. Stop recording and get the disk path
    const videoDiskPath = await stopRecording();
    const filename = path.basename(videoDiskPath);
    const webUrl = `/recordings/${filename}`;

    let narration = "Video action recorded successfully.";


    try {
        console.log(`[Video Analysis] Recording stopped. Analyzing: ${videoDiskPath}`);

        // 2. Upload to Google AI File Manager
        const fileManager = new GoogleAIFileManager(apiKey);
        const uploadResult = await fileManager.uploadFile(videoDiskPath, {
            mimeType: 'video/mp4',
            displayName: filename,
        });

        const fileUri = uploadResult.file.uri;
        const uploadName = uploadResult.file.name;
        console.log(`[Video Analysis] Uploaded to Gemini: ${fileUri}`);

        // 3. Wait for processing (polling)
        let file = await fileManager.getFile(uploadName);
        let attempts = 0;
        while (file.state === FileState.PROCESSING && attempts < 30) {
            process.stdout.write(".");
            await new Promise((resolve) => setTimeout(resolve, 2000));
            file = await fileManager.getFile(uploadName);
            attempts++;
        }

        if (file.state === FileState.FAILED) {
            console.warn("[Video Analysis] Remote processing failed. Using generic narration.");
        } else {
            console.log(`[Video Analysis] Video ready for analysis.`);

            // 4. Analyze with Gemini 2.5 Flash
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const prompt = "Analyze this software interaction video. Describe what the user is doing and write a 2-sentence narration for a tutorial. Start with 'In this step...'";
            const result = await model.generateContent([
                {
                    fileData: {
                        mimeType: file.mimeType,
                        fileUri: file.uri,
                    },
                },
                { text: prompt },
            ]);

            narration = result.response.text();
            console.log(`[Video Analysis] AI Narration: ${narration}`);
        }

        // 5. Cleanup
        try {
            await fileManager.deleteFile(uploadName);
        } catch (e) {
            console.error('Failed to delete remote file', e);
        }

    } catch (aiError: any) {
        console.error(`[Video Analysis] AI features unavailable: ${aiError.message}`);
        // Fallback is already set
    }

    return {
        success: true,
        title: pageTitle || 'Recorded Step',
        narration: narration,
        videoUrl: webUrl,
        screenshot: webUrl,
        type: 'video'
    };
}
