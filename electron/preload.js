/**
 * Electron preload script — runs in renderer context with Node integration
 * disabled.  Exposes a minimal, safe API to the renderer via contextBridge.
 */

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronApp', {
  /** Semantic version string of the packaged Electron app (e.g. "1.0.0"). */
  version: process.env.npm_package_version || require('../package.json').version,

  /** Platform identifier: "win32" | "darwin" | "linux" */
  platform: process.platform,

  /** Send an IPC message to the main process (fire-and-forget). */
  send: (channel, ...args) => {
    // Whitelist permitted channels to prevent the renderer escalating privileges.
    const allowed = ['app:quit', 'app:minimize', 'app:maximize'];
    if (allowed.includes(channel)) ipcRenderer.send(channel, ...args);
  },
});
