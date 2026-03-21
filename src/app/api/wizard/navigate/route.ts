import { NextRequest, NextResponse } from 'next/server'
import { getBrowserSession } from '@/lib/browser-session'

export async function POST(request: NextRequest) {
    const browser = await getBrowserSession()
    if (!browser) {
        return NextResponse.json({ error: 'No active browser session' }, { status: 404 })
    }

    const { url } = await request.json()
    if (!url) {
        return NextResponse.json({ error: 'url required' }, { status: 400 })
    }

    try {
        const pages = await browser.pages()
        const page = pages[pages.length - 1]
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await new Promise(r => setTimeout(r, 800)) // let page settle

        const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false })
        const finalUrl = page.url()
        const title = await page.title()

        return NextResponse.json({
            screenshot: `data:image/png;base64,${screenshot}`,
            url: finalUrl,
            title,
        })
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
