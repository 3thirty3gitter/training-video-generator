
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

// "Local browser mode": when the user runs scripts/record-local.bat on their
// PC, it opens their own Chrome with a CDP debug port and reverse-tunnels it
// to this address (the docker network gateway on the VPS). If reachable, the
// wizard drives the user's real local browser instead of a server-side one.
const LOCAL_BROWSER_URL = process.env.LOCAL_BROWSER_URL || ''

interface BrowserSession {
    browserWSEndpoint: string
    // 'local' = user's own browser over tunnel (disconnect, never close)
    // 'server' = chromium launched on the server (close on stop)
    mode?: 'local' | 'server'
}

function readSessionFile(): BrowserSession | null {
    try {
        return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'))
    } catch {
        return null
    }
}

async function tryConnectLocalBrowser(): Promise<Browser | null> {
    if (!LOCAL_BROWSER_URL) return null
    try {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 1500)
        const res = await fetch(`${LOCAL_BROWSER_URL}/json/version`, { signal: ctrl.signal })
        clearTimeout(timer)
        if (!res.ok) return null

        const info = await res.json() as { webSocketDebuggerUrl?: string }
        if (!info.webSocketDebuggerUrl) return null

        // Chrome reports the ws URL based on the request Host header, but
        // normalize it to the tunnel address to be safe
        const ws = info.webSocketDebuggerUrl.replace(
            /^ws:\/\/[^/]+/,
            LOCAL_BROWSER_URL.replace(/^http/, 'ws')
        )

        const browser = await puppeteer.connect({
            browserWSEndpoint: ws,
            defaultViewport: null,
        })
        console.log('🖥️  Connected to USER\'S LOCAL browser via tunnel — local mode active')
        return browser
    } catch {
        return null
    }
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

    // Prefer the user's own local browser if the record-local tunnel is up
    const localBrowser = await tryConnectLocalBrowser()
    if (localBrowser) {
        const session: BrowserSession = {
            browserWSEndpoint: localBrowser.wsEndpoint(),
            mode: 'local',
        }
        fs.writeFileSync(SESSION_FILE, JSON.stringify(session))
        console.log(`💾 Saved local-mode browser session to ${SESSION_FILE}`)
        return localBrowser
    }

    console.log('🚀 Launching new browser session...')
    await ensureDisplay()

    // No tracked session exists, so any Singleton* lock files in the profile
    // are stale (e.g. left by a previous container or a crashed Chrome) and
    // would block the launch with "profile in use by another computer".
    for (const lock of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
        try { fs.rmSync(path.join(USER_DATA_DIR, lock), { force: true }) } catch { }
    }

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
            // Xvfb has no window manager, so --start-maximized does nothing
            // there; force the window to fill the virtual display instead
            ...(isWindows ? [] : ['--window-size=1920,1080', '--window-position=0,0']),
        ],
    })

    const session: BrowserSession = {
        browserWSEndpoint: browser.wsEndpoint(),
        mode: 'server',
    }

    fs.writeFileSync(SESSION_FILE, JSON.stringify(session))
    console.log(`💾 Saved browser session to ${SESSION_FILE}`)

    return browser
}

export async function closeBrowserSession() {
    try {
        const sessionInfo = readSessionFile()
        const browser = await getBrowserSession()
        if (browser) {
            if (sessionInfo?.mode === 'local') {
                // The user's own browser - detach but never close their window
                console.log('🛑 Detaching from local browser (leaving it open)...')
                browser.disconnect()
            } else {
                console.log('🛑 Closing browser session...')
                await browser.close()
            }
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
