import { NextRequest, NextResponse } from 'next/server'
import { getBrowserSession } from '@/lib/browser-session'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Immediately captures current browser state — no user interaction polling needed.
// Used by the remote browser UI (Codespace mode) when user clicks "Add This Step".
export async function POST(_request: NextRequest) {
    const browser = await getBrowserSession()
    if (!browser) {
        return NextResponse.json({ error: 'No active browser session' }, { status: 404 })
    }

    try {
        const pages = await browser.pages()
        const page = pages[pages.length - 1]

        const finalUrl = page.url()
        const pageTitle = await page.title()
        const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false }) as string

        let narration = `Welcome to the ${pageTitle}.`
        const apiKey = process.env.GEMINI_API_KEY
        if (apiKey && apiKey !== 'your_gemini_api_key_here') {
            try {
                const genAI = new GoogleGenerativeAI(apiKey)
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
                const res = await model.generateContent([
                    `Page title: "${pageTitle}". URL: ${finalUrl}. Write a 2-sentence tutorial narration describing this screen.`,
                    { inlineData: { data: screenshot, mimeType: 'image/png' } }
                ])
                narration = res.response.text()
            } catch { /* keep default */ }
        }

        return NextResponse.json({
            success: true,
            title: pageTitle,
            url: finalUrl,
            screenshot: `data:image/png;base64,${screenshot}`,
            narration,
            action: `navigate to ${finalUrl}`,
            type: 'image',
        })
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
