
import puppeteer, { Browser } from 'puppeteer'
import fs from 'fs'
import path from 'path'
import { execSync, spawn } from 'child_process'

// Ensure a virtual display is available for headless environments (e.g. Codespaces)
// On Windows this is a no-op — the display is always available natively
async function ensureDisplay(): Promise<void> {
    if (process.platform === 'win32') {
        console.log('🖥️  Windows detected — skipping virtual display setup')
        return
    }
    // Always force :99 — don't trust whatever DISPLAY may already be set to
    process.env.DISPLAY = ':99'
    // If Xvfb is already running on :99, nothing to do
    try {
        execSync('pgrep -f "Xvfb :99"', { stdio: 'ignore' })
        console.log('🖥️  Virtual display :99 already running')
        return
    } catch { /* not running — start it */ }
    try {
        execSync('pkill Xvfb', { stdio: 'ignore' })
    } catch { /* ignore */ }
    spawn('Xvfb', [':99', '-screen', '0', '1920x1080x24', '-ac'], { detached: true, stdio: 'ignore' }).unref()
    console.log('🖥️  Started virtual display :99 - waiting for it to initialize...')
    // Wait for Xvfb to be ready before Chromium tries to connect
    await new Promise(resolve => setTimeout(resolve, 1500))
    console.log('🖥️  Virtual display ready')
}

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
    await ensureDisplay()
    const isWindows = process.platform === 'win32'
    const browser = await puppeteer.launch({
        headless: false, // Always visible for interactive mode
        defaultViewport: null,
        userDataDir: USER_DATA_DIR,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            ...(isWindows ? [] : ['--disable-gpu']),
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
