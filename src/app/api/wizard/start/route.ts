
import { NextRequest, NextResponse } from 'next/server'
import { createBrowserSession } from '@/lib/browser-session'

const VERCEL_MSG = 'The Interactive Wizard requires a visible browser and only works in local development (npm run dev). It cannot run on Vercel serverless.'

export async function POST(request: NextRequest) {
    if (process.env.VERCEL) {
        return NextResponse.json({ error: VERCEL_MSG }, { status: 503 })
    }
    try {
        const { url } = await request.json()

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 })
        }

        console.log(`Wizard: Start request for ${url}`)

        const browser = await createBrowserSession()

        // Ensure we have a page
        const pages = await browser.pages()
        const page = pages.length > 0 ? pages[0] : await browser.newPage()

        await page.setViewport({ width: 1920, height: 1080 })

        // Navigate
        // Navigate (don't block the API response indefinitely)
        // We catch errors here so the wizard still 'starts' even if the URL is weird
        page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.error('Initial nav error:', e));

        // Wait a brief moment to ensure browser window is up
        await new Promise(r => setTimeout(r, 1000));

        return NextResponse.json({ success: true, status: 'started' })

    } catch (error) {
        console.error('Wizard Start Error:', error)
        return NextResponse.json(
            { error: 'Failed to start browser', details: String(error) },
            { status: 500 }
        )
    }
}
