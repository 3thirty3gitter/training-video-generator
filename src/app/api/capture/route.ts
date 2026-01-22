import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

interface Step {
    id: string
    title: string
    action: string
    narration: string
    screenshot?: string
    waitTime?: number
}

export async function POST(request: NextRequest) {
    try {
        const { url, steps } = await request.json()

        if (!url || !steps || steps.length === 0) {
            return NextResponse.json(
                { error: 'URL and steps are required' },
                { status: 400 }
            )
        }

        console.log(`Starting screenshot capture for ${url}`)

        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
            ],
        })

        const page = await browser.newPage()
        await page.setViewport({ width: 1920, height: 1080 })

        // Navigate to the app
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

        const updatedSteps: Step[] = []

        for (const step of steps) {
            console.log(`Processing step: ${step.title}`)

            try {
                // Execute the action if specified
                if (step.action) {
                    if (step.action.toLowerCase().startsWith('navigate to ')) {
                        const targetUrl = step.action.replace(/navigate to /i, '').trim()
                        const fullUrl = targetUrl.startsWith('http') ? targetUrl : `${url}${targetUrl}`
                        await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 30000 })
                    } else if (step.action.toLowerCase().startsWith('click ')) {
                        const selector = step.action.replace(/click /i, '').trim()
                        await page.waitForSelector(selector, { timeout: 10000 })
                        await page.click(selector)
                    } else if (step.action.toLowerCase().startsWith('type ')) {
                        const [, selector, ...textParts] = step.action.split(' ')
                        const text = textParts.join(' ')
                        await page.waitForSelector(selector, { timeout: 10000 })
                        await page.type(selector, text)
                    } else if (step.action.toLowerCase().startsWith('scroll to ')) {
                        const selector = step.action.replace(/scroll to /i, '').trim()
                        await page.waitForSelector(selector, { timeout: 10000 })
                        const element = await page.$(selector)
                        if (element) {
                            await element.scrollIntoView()
                        }
                    }
                }

                // Wait for the specified time
                await page.waitForTimeout(step.waitTime || 1000)

                // Take screenshot
                const screenshot = await page.screenshot({
                    encoding: 'base64',
                    fullPage: false
                })

                updatedSteps.push({
                    ...step,
                    screenshot: `data:image/png;base64,${screenshot}`,
                })

                console.log(`✓ Captured screenshot for: ${step.title}`)
            } catch (error) {
                console.error(`Error processing step ${step.title}:`, error)
                // Add step without screenshot if it fails
                updatedSteps.push(step)
            }
        }

        await browser.close()

        return NextResponse.json({
            success: true,
            steps: updatedSteps,
            message: `Captured ${updatedSteps.filter(s => s.screenshot).length} screenshots`
        })

    } catch (error) {
        console.error('Capture error:', error)
        return NextResponse.json(
            { error: 'Failed to capture screenshots', details: String(error) },
            { status: 500 }
        )
    }
}
