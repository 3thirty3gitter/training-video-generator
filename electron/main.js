/**
 * Electron main process — Training Video Generator desktop wrapper.
 *
 * Responsibilities:
 *  1. Find a free TCP port (starting at 3000).
 *  2. Spawn the Next.js standalone server (server.js) as a child process,
 *     injecting FFMPEG_PATH and PUPPETEER_EXECUTABLE_PATH into its environment.
 *  3. Show a loading window while the server boots, then open the full
 *     BrowserWindow once the health-check endpoint responds.
 *  4. Kill the server child process cleanly on app quit.
 */

'use strict';

const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const fs = require('fs');

// ── Path resolution ────────────────────────────────────────────────────────

/**
 * Resolve the path of a bundled resource.  When packaged by electron-builder
 * (asar: false), resources land in process.resourcesPath.  During development
 * they live relative to this file.
 */
function resourcePath(...segments) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, ...segments);
  }
  return path.join(__dirname, '..', ...segments);
}

// ── FFmpeg path ────────────────────────────────────────────────────────────

let ffmpegPath;
try {
  // @ffmpeg-installer/ffmpeg resolves the correct platform binary at require-time.
  ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
} catch {
  ffmpegPath = ''; // will fall back to system ffmpeg
}

// ── Chromium / Puppeteer path ──────────────────────────────────────────────

let puppeteerChromiumPath;
try {
  // puppeteer v21 exposes executablePath() synchronously.
  const puppeteer = require('puppeteer');
  puppeteerChromiumPath = puppeteer.executablePath();
} catch {
  // Fall back: look for system Chrome in well-known locations.
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ];
  puppeteerChromiumPath = candidates.find(p => fs.existsSync(p)) || '';
}

// ── Port discovery ─────────────────────────────────────────────────────────

/**
 * Returns a promise that resolves to the first free TCP port >= startPort.
 */
function findFreePort(startPort = 3000) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => {
      // Port in use — try the next one.
      findFreePort(startPort + 1).then(resolve).catch(reject);
    });
    server.listen(startPort, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

// ── Health check ───────────────────────────────────────────────────────────

/**
 * Polls http://localhost:PORT/api/project/load until it returns any HTTP
 * response (even an error body), indicating the Next.js server is up.
 */
function waitForServer(port, maxAttempts = 60, intervalMs = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    function attempt() {
      attempts += 1;
      const req = http.request(
        { hostname: '127.0.0.1', port, path: '/api/project/load', method: 'GET' },
        () => resolve(), // any HTTP response means the server is ready
      );
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error(`Server did not start after ${maxAttempts} attempts`));
        } else {
          setTimeout(attempt, intervalMs);
        }
      });
      req.setTimeout(800, () => {
        req.destroy();
        setTimeout(attempt, intervalMs);
      });
      req.end();
    }

    attempt();
  });
}

// ── Global state ───────────────────────────────────────────────────────────

let mainWindow = null;
let loadingWindow = null;
let serverProcess = null;
let serverPort = 3000;

// ── Window factories ───────────────────────────────────────────────────────

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 480,
    height: 300,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  loadingWindow.loadFile(path.join(__dirname, 'loading.html'));
  loadingWindow.once('ready-to-show', () => loadingWindow.show());
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#0f172a',
    title: 'Training Video Generator',
    autoHideMenuBar: true,       // hides menu bar; use Alt to reveal on Windows
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);

  mainWindow.once('ready-to-show', () => {
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.close();
      loadingWindow = null;
    }
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Server spawn ───────────────────────────────────────────────────────────

async function startServer(port) {
  // The Next.js standalone build outputs server.js at .next/standalone/server.js
  const serverScript = resourcePath('.next', 'standalone', 'server.js');

  if (!fs.existsSync(serverScript)) {
    throw new Error(
      `Next.js standalone server not found at:\n${serverScript}\n\n` +
      'Run "npm run build" before launching the desktop app.',
    );
  }

  const env = {
    ...process.env,
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production',
    // FFmpeg — use the bundled binary when available.
    FFMPEG_PATH: ffmpegPath || process.env.FFMPEG_PATH || '',
    // Puppeteer / Chromium — use the bundled binary when available.
    PUPPETEER_EXECUTABLE_PATH:
      puppeteerChromiumPath || process.env.PUPPETEER_EXECUTABLE_PATH || '',
    // Signal to the app that it is running inside Electron.
    ELECTRON_APP: '1',
  };

  serverProcess = spawn(process.execPath, [serverScript], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: resourcePath('.next', 'standalone'),
  });

  serverProcess.stdout.on('data', d => process.stdout.write(`[server] ${d}`));
  serverProcess.stderr.on('data', d => process.stderr.write(`[server] ${d}`));

  serverProcess.on('exit', (code, signal) => {
    console.log(`[server] exited code=${code} signal=${signal}`);
    serverProcess = null;
    // If the main window is still open, this is unexpected — notify the user.
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox(
        'Server stopped unexpectedly',
        `The application server exited (code ${code}). Please restart the app.`,
      );
      app.quit();
    }
  });
}

// ── App lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  try {
    serverPort = await findFreePort(3000);
    createLoadingWindow();
    await startServer(serverPort);
    await waitForServer(serverPort);
    createMainWindow();
  } catch (err) {
    dialog.showErrorBox('Startup error', err.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // Keep the process alive on macOS (conventional behaviour) until explicit quit.
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  // Re-create window on macOS when dock icon is clicked and no windows are open.
  if (mainWindow === null && serverProcess) createMainWindow();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
});
