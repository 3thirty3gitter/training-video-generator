
import puppeteer, { Browser } from 'puppeteer'
import fs from 'fs'
import path from 'path'

const SESSION_FILE = path.resolve('./.puppeteer_session')
const USER_DATA_DIR = path.resolve('./.puppeteer_data')

interface BrowserSession {
    browserWSEndpoint: string
}

export async function getBrowserSession(): Promise<Browser | null> {
    if (!fs.existsSync(SESSION_FILE)) {
        console.log('Wizard: Session file not found.');
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
        console.log('🔌 Connected successfully.');

        return browser
    } catch (error) {
        console.error('Failed to connect to browser session:', error)
        // Clean up invalid session file
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
    const browser = await puppeteer.launch({
        headless: false, // Always visible for interactive mode
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

    const session: BrowserSession = {
        browserWSEndpoint: browser.wsEndpoint()
    }

    fs.writeFileSync(SESSION_FILE, JSON.stringify(session))
    console.log(`💾 Saved browser session to ${SESSION_FILE}`)

    return browser
}

export async function closeBrowserSession() {
    try {
        const browser = await getBrowserSession()
        if (browser) {
            console.log('🛑 Closing browser session...')
            await browser.close()
        }
    } catch (error) {
        console.error('Error closing browser:', error)
    } finally {
        if (fs.existsSync(SESSION_FILE)) {
            fs.unlinkSync(SESSION_FILE)
            console.log('🗑️ Removed session file')
        }
    }
}
