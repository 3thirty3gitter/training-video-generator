import { NextResponse } from 'next/server'
import { getBrowserSession } from '@/lib/browser-session'

export const dynamic = 'force-dynamic'

export async function GET() {
    const browser = await getBrowserSession()
    if (!browser) {
        return NextResponse.json({ error: 'No active browser session' }, { status: 404 })
    }

    try {
        const pages = await browser.pages()
        const page = pages[pages.length - 1]
        const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false })
        const url = page.url()
        const title = await page.title()

        return NextResponse.json({
            screenshot: `data:image/png;base64,${screenshot}`,
            url,
            title,
        })
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
