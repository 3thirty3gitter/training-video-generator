const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');

const isDev = !app.isPackaged;
const PORT = 3456; // Use non-standard port to avoid conflicts

let mainWindow;
let serverProcess;

// Get the app root directory (where next.config.js lives)
function getAppRoot() {
  if (isDev) {
    return path.join(__dirname, '..');
  }
  // In production, resources are in the app.asar or unpacked directory
  return path.join(process.resourcesPath, 'app');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Training Video Generator',
    autoHideMenuBar: true,
    show: false,
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Wait for the Next.js server to be ready
function waitForServer(port, retries = 60, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const socket = new net.Socket();
      socket.setTimeout(300);
      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.on('timeout', () => {
        socket.destroy();
        if (attempts < retries) setTimeout(check, interval);
        else reject(new Error('Server did not start in time'));
      });
      socket.on('error', () => {
        if (attempts < retries) setTimeout(check, interval);
        else reject(new Error('Server did not start in time'));
      });
      socket.connect(port, '127.0.0.1');
    };
    check();
  });
}

async function startNextServer() {
  const appRoot = getAppRoot();

  if (isDev) {
    // In dev, the Next.js dev server is started separately via concurrently
    // Just wait for it
    await waitForServer(PORT);
    return;
  }

  // Production: start Next.js custom server
  process.chdir(appRoot);
  process.env.PORT = String(PORT);
  process.env.NODE_ENV = 'production';

  const next = require('next');
  const nextApp = next({
    dev: false,
    dir: appRoot,
    port: PORT,
  });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  await new Promise((resolve, reject) => {
    server.listen(PORT, '127.0.0.1', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  serverProcess = server;
  console.log(`Next.js server running on http://localhost:${PORT}`);
}

app.whenReady().then(async () => {
  try {
    await startNextServer();
    createWindow();
  } catch (err) {
    console.error('Failed to start server:', err);
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start the application server.\n\n${err.message}`
    );
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.close();
  }
  app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.close();
  }
});
