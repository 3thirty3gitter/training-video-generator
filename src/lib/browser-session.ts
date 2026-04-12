
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
    // Always force :99
    process.env.DISPLAY = ':99'

    // Check if display :99 is actually accepting connections (not just if Xvfb process exists —
    // pgrep matching is unreliable because the shell command itself contains "Xvfb :99")
    const isDisplayReady = (): boolean => {
        try {
            execSync('xdpyinfo -display :99', { stdio: 'ignore', timeout: 2000 })
            return true
        } catch {
            return false
        }
    }

    if (isDisplayReady()) {
        console.log('🖥️  Virtual display :99 already running')
        return
    }

    // Kill any stale Xvfb process before starting fresh
    try {
        execSync('pkill -9 Xvfb', { stdio: 'ignore' })
        await new Promise(resolve => setTimeout(resolve, 300))
    } catch { /* ignore — it wasn't running */ }

    spawn('Xvfb', [':99', '-screen', '0', '1920x1080x24', '-ac'], { detached: true, stdio: 'ignore' }).unref()
    console.log('🖥️  Started virtual display :99 - waiting for it to be ready...')

    // Poll until xdpyinfo confirms display is up (up to 8 seconds)
    for (let i = 0; i < 16; i++) {
        await new Promise(resolve => setTimeout(resolve, 500))
        if (isDisplayReady()) {
            console.log('🖥️  Virtual display :99 ready')
            return
        }
    }

    throw new Error('Failed to start virtual display — Xvfb did not become ready within 8 seconds')
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
