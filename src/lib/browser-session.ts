
import puppeteer, { Browser } from 'puppeteer'
import puppeteerCore from 'puppeteer-core'
import fs from 'fs'
import path from 'path'

const SESSION_FILE = path.resolve('./.puppeteer_session')
const USER_DATA_DIR = path.resolve('./.puppeteer_data')

const IS_VERCEL = !!process.env.VERCEL

interface BrowserSession {
    browserWSEndpoint: string
}

// Module-level singleton — persists across warm Lambda invocations (Vercel)
// and across requests in local dev. This avoids file-based session on Vercel
// where the filesystem is ephemeral per-invocation.
let _browserInstance: Browser | null = null

export async function getBrowserSession(): Promise<Browser | null> {
    // Check in-memory singleton first (works on both Vercel and local)
    if (_browserInstance) {
        try {
            await _browserInstance.pages() // will throw if browser has closed
            return _browserInstance
        } catch {
            _browserInstance = null
        }
    }

    // On Vercel, no filesystem persistence — in-memory singleton only
    if (IS_VERCEL) {
        console.log('Wizard: No active Vercel browser session in memory.')
        return null
    }

    // Local dev: try reconnecting via session file
    if (!fs.existsSync(SESSION_FILE)) {
        console.log('Wizard: Session file not found.')
        return null
    }

    try {
        const data = fs.readFileSync(SESSION_FILE, 'utf-8')
        const session: BrowserSession = JSON.parse(data)

        console.log(`🔌 Connecting to existing browser session: ${session.browserWSEndpoint.substring(0, 50)}...`)

        const browser = await puppeteer.connect({
            browserWSEndpoint: session.browserWSEndpoint,
            defaultViewport: null,
        })
        console.log('🔌 Connected successfully.')
        _browserInstance = browser
        return browser
    } catch (error) {
        console.error('Failed to connect to browser session:', error)
        try { fs.unlinkSync(SESSION_FILE) } catch { }
        return null
    }
}

export async function createBrowserSession(): Promise<Browser> {
    // If a session exists, try to reuse it or kill it
    const existing = await getBrowserSession()
    if (existing) {
        return existing
    }

    console.log('🚀 Launching new browser session...')

    let browser: Browser

    if (IS_VERCEL) {
        // Serverless environment: use @sparticuz/chromium
        // The binary is NOT bundled — must be downloaded from CDN at cold-start.
        // Set CHROMIUM_PATH env var on Vercel to override the CDN URL if needed.
        const chromium = (await import('@sparticuz/chromium')).default
        chromium.setHeadlessMode = true
        chromium.setGraphicsMode = false
        const chromiumRemoteUrl = process.env.CHROMIUM_PATH ||
            'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
        const executablePath = await chromium.executablePath(chromiumRemoteUrl)
        browser = await puppeteerCore.launch({
            executablePath,
            headless: true,
            defaultViewport: chromium.defaultViewport,
            args: chromium.args,
        }) as unknown as Browser
    } else {
        // Local dev: use bundled puppeteer Chrome
        browser = await puppeteer.launch({
            headless: false, // Visible for interactive local use
            defaultViewport: null,
            userDataDir: USER_DATA_DIR,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--start-maximized',
            ],
        })

        // Persist session file only for local dev (filesystem is persistent)
        fs.writeFileSync(SESSION_FILE, JSON.stringify({ browserWSEndpoint: browser.wsEndpoint() }))
        console.log(`💾 Saved browser session to ${SESSION_FILE}`)
    }

    _browserInstance = browser
    return browser
}

export async function closeBrowserSession() {
    try {
        const browser = _browserInstance || await getBrowserSession()
        if (browser) {
            console.log('🛑 Closing browser session...')
            await browser.close()
        }
    } catch (error) {
        console.error('Error closing browser:', error)
    } finally {
        _browserInstance = null
        if (!IS_VERCEL && fs.existsSync(SESSION_FILE)) {
            fs.unlinkSync(SESSION_FILE)
            console.log('🗑️ Removed session file')
        }
    }
}
