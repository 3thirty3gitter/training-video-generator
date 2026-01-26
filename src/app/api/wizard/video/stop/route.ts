
import { NextRequest, NextResponse } from 'next/server'
import { processAndAnalyzeVideo } from '@/lib/video-analysis'

export async function POST(request: NextRequest) {
    try {
        const result = await processAndAnalyzeVideo();
        return NextResponse.json(result);
    } catch (error) {
        console.error('[Video API] Stop/Analyze failed:', error)
        return NextResponse.json({ error: 'Failed to process video', details: String(error) }, { status: 500 })
    }
}
