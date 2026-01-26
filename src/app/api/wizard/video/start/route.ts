
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

        return NextResponse.json({ success: true, path: videoPath });
    } catch (error) {
        console.error('[Video API] Start failed:', error)
        return NextResponse.json({ error: 'Failed to start recording', details: String(error) }, { status: 500 })
    }
}
