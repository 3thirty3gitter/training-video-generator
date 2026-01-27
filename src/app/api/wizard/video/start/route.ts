
import { NextRequest, NextResponse } from 'next/server'
import { getBrowserSession } from '@/lib/browser-session'
import { startRecording, isRecording } from '@/lib/video-recorder'

export async function POST(request: NextRequest) {
    try {
        if (isRecording()) {
            return NextResponse.json({ error: 'Already recording' }, { status: 400 });
        }

        const browser = await getBrowserSession()
        if (!browser) {
            return NextResponse.json({ error: 'No active browser session' }, { status: 404 })
        }

        const pages = await browser.pages();
        const activePage = pages[pages.length - 1]; // Assume last page is active

        if (!activePage) {
            return NextResponse.json({ error: 'No active page found' }, { status: 404 })
        }

        const videoPath = await startRecording(activePage);
        console.log(`[Video API] Recording started: ${videoPath}`);

        // Inject visible timer
        // Inject title-based timer (Visual feedback that doesn't ruin the video recording)
        await activePage.evaluate(() => {
            const originalTitle = document.title;
            (window as any)._originalTitle = originalTitle;

            let seconds = 30;
            const updateTitle = () => {
                const prefix = seconds <= 5 ? `⚠️ [${seconds}s] ` : `🔴 REC [${seconds}s] `;
                document.title = prefix + originalTitle;
            };

            updateTitle();

            const interval = setInterval(() => {
                seconds--;
                if (seconds < 0) {
                    clearInterval(interval);
                    document.title = "✅ DONE - " + originalTitle;
                } else {
                    updateTitle();
                }
            }, 1000);

            // Store interval to clear it if removed externally
            (window as any)._recTimer = interval;
        });


        return NextResponse.json({ success: true, path: videoPath });
    } catch (error) {
        console.error('[Video API] Start failed:', error)
        return NextResponse.json({ error: 'Failed to start recording', details: String(error) }, { status: 500 })
    }
}
