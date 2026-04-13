# Training Video Generator Pro — Handoff Documentation

**Repository:** https://github.com/3thirty3gitter/training-video-generator  
**Created:** January 2026  
**Last Updated:** April 13, 2026  
**Status:** Local dev working ✅ | Electron Windows build v1.0.1 released ✅ | Vercel NOT supported (by design)

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Business Context](#business-context)
3. [Technical Architecture](#technical-architecture)
4. [Environment Setup](#environment-setup)
5. [How It Works — User Workflow](#how-it-works)
6. [API Documentation](#api-documentation)
7. [File Structure](#file-structure)
8. [Building the Windows Exe](#building-the-windows-exe)
9. [Known Issues & Fixes Applied](#known-issues--fixes-applied)
10. [Why Vercel Does Not Work](#why-vercel-does-not-work)
11. [Deployment Options That DO Work](#deployment-options-that-do-work)
12. [Future: SaaS + Licence Key System](#future-saas--licence-key-system)
13. [Dependencies](#dependencies)
14. [Troubleshooting](#troubleshooting)
15. [Support & Maintenance](#support--maintenance)

---

## 🎯 Project Overview

### What Is This?

A desktop application that **automates the creation of training videos** for SaaS products. It launches a visible, interactive browser window, lets you navigate your app, captures screenshots at each step, generates AI narration with Google Gemini, and exports a Word document ready for Google NotebookLM video generation.

### Primary Use Case

**PrintPilot.ca** — Creating onboarding, feature, and marketing videos for a print management SaaS. Designed to be reusable for any SaaS product.

### Key Features

- ✅ **Wizard Mode** — Opens a real browser window, you navigate your app, click "Capture" at each step
- ✅ **Auto Capture** — Puppeteer navigates and screenshots automatically from defined step actions
- ✅ **AI Narration** — Gemini 2.0 Flash generates professional narration per step
- ✅ **Voice Over Studio** — Text-to-speech with multiple voices and styles
- ✅ **Video Stitching** — Combines screenshots + audio into MP4 via FFmpeg
- ✅ **Document Export** — Creates Word (.docx) with embedded images + narration
- ✅ **Embed Widget** — Embeds the tutorial as an interactive web widget
- ✅ **Project Persistence** — Auto-saves project data to `project_data.json`
- ✅ **Electron Desktop App** — Packaged as a Windows .exe (no Node.js required by end user)

---

## 💼 Business Context

### Problem Solved

Creating training videos for SaaS products is:
- **Time-consuming** — Hours of work per video
- **Repetitive** — Same process for every feature/update
- **Costly** — Professional tools run $20-50/month
- **Error-prone** — Manual screenshots miss steps

### Solution

Reduces video creation from hours to minutes by automating browser interaction, screenshot capture, narration writing, and audio generation.

### ROI

- **Time Saved:** ~4-6 hours per training video
- **Cost:** $0 to run (uses free Gemini tier)
- **Quality:** Professional, consistent videos every time

---

## 🏗️ Technical Architecture

### Tech Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Frontend** | Next.js | 14.2.x | React framework |
| **UI** | Tailwind CSS | 3.4.x | Styling |
| **Desktop Shell** | Electron | 41.1.x | Windows app wrapper |
| **Browser Automation** | Puppeteer | 21.11.x | Screenshot & interactive capture |
| **AI Narration** | Google Gemini | 2.0 Flash | Narration generation |
| **TTS** | Kokoro JS | 1.2.x | Text-to-speech voice generation |
| **Video** | FFmpeg / fluent-ffmpeg | 2.1.x | MP4 stitching |
| **Documents** | docx | 8.5.x | Word doc export |
| **Runtime** | Node.js | 20+ | Server runtime |

### Architecture — How It Runs

```
┌──────────────────────────────────────────────────────┐
│                  Electron Shell (main.js)             │
│  - Starts Next.js production server on port 3456     │
│  - Opens BrowserWindow pointing to localhost:3456    │
│  - Manages Puppeteer Chromium path                   │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│              Next.js App (port 3456)                  │
│  ┌──────────────┬────────────────┬────────────────┐  │
│  │  page.tsx    │  StepEditor    │  PreviewPanel  │  │
│  │  (main UI)   │  .tsx          │  .tsx          │  │
│  └──────────────┴────────────────┴────────────────┘  │
│  ┌──────────────────────────────────────────────────┐ │
│  │                   API Routes                      │ │
│  │  /api/wizard/start   — launch browser session   │ │
│  │  /api/wizard/capture — capture step screenshot  │ │
│  │  /api/wizard/stop    — close browser session    │ │
│  │  /api/capture        — auto capture (headless)  │ │
│  │  /api/generate-narration — Gemini AI            │ │
│  │  /api/export         — .docx export             │ │
│  │  /api/export/video   — MP4 stitching            │ │
│  │  /api/voice-preview  — TTS preview              │ │
│  │  /api/upload-audio   — upload narration audio   │ │
│  │  /api/project/save   — persist project          │ │
│  │  /api/project/load   — restore project          │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
┌────────────────────┐   ┌─────────────────────────┐
│  Puppeteer         │   │  Google Gemini API       │
│  (visible browser  │   │  gemini-2.0-flash        │
│   window on        │   │  narration generation    │
│   Windows/Linux)   │   └─────────────────────────┘
└────────────────────┘
```

### Key Library Files

| File | Purpose |
|------|---------|
| `src/lib/browser-session.ts` | Manages shared Puppeteer browser — creates, reuses, closes sessions. Handles Xvfb virtual display on Linux/Codespaces. Skips display setup on Windows. |
| `src/lib/tts-engine.ts` | Text-to-speech using Kokoro JS + Edge TTS fallback |
| `src/lib/video-stitcher.ts` | FFmpeg-based MP4 stitching from screenshots + audio |
| `src/lib/video-recorder.ts` | Screen recording via puppeteer-screen-recorder |
| `src/lib/paths.ts` | Cross-platform path resolution (dev vs Electron production) |
| `electron/main.js` | Electron entry point — starts Next.js, creates window, manages Chromium path |
| `electron/preload.js` | Electron preload script for context bridge |
| `scripts/build-electron.js` | Full build pipeline: Next.js → electron-packager → cleanup → Chromium bundle |

---

## 🚀 Environment Setup

### For Development (GitHub Codespace or local Linux/Mac)

```bash
git clone https://github.com/3thirty3gitter/training-video-generator.git
cd training-video-generator
npm install
```

Create `.env.local`:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

Start dev server:
```bash
npm run dev
# App runs at http://localhost:3456
```

> **Note on port:** The app runs on **3456**, not 3000.

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | Yes for AI narration | Gemini 2.0 Flash API key. Get one free at https://aistudio.google.com/app/apikey |
| `TVG_USER_DATA` | Set automatically by Electron | User data directory path (Electron production only) |

### Codespace-Specific Notes

- **No display server** — The dev container (GitHub Codespaces) has no physical screen. The Wizard feature launches a Puppeteer browser window, which requires a virtual display.
- The app auto-starts **Xvfb** (virtual framebuffer) on `:99` when it detects it's not on Windows and `DISPLAY` is unset or invalid.
- You can view the browser via **noVNC** on port 6080. Install with: `sudo apt-get install -y x11vnc novnc`
- The Wizard works fully as intended on the **Windows Electron build** without any of this complexity.
- To **view the browser** while testing the Wizard in Codespace, use noVNC (see below).

#### Viewing the Wizard Browser in Codespace (noVNC)

The browser runs on the virtual display `:99` — invisible by default. Start noVNC to view it:

```bash
# Start VNC server on the virtual display
x11vnc -display :99 -nopw -forever -rfbport 5900 &

# Start noVNC websocket proxy
nohup /usr/share/novnc/utils/novnc_proxy --vnc localhost:5900 --listen 6080 > /tmp/novnc.log 2>&1 &
```

Then open **http://localhost:6080/vnc.html** in your browser (VS Code will auto-forward port 6080 — check the Ports tab).

Both `x11vnc` and `novnc` are pre-installed in the dev container.

---

## 🔧 How It Works

### User Workflow — Wizard Mode (Interactive)

1. Enter **Project Name** and **App URL**
2. Click **"Start Wizard"** → A real Chromium browser opens showing your app
3. Navigate your app manually (log in, go to the right page)
4. Click **"Capture Step"** in the floating overlay button
5. The app screenshots that moment and creates a step
6. Repeat for each step in your tutorial
7. Click **"Stop Wizard"** when done

### User Workflow — Auto Capture Mode

1. Define steps with action syntax (see below)
2. Click **"Capture All"** → Puppeteer navigates and screenshots automatically

**Action syntax:**
```
navigate to /dashboard
click #create-button
type #search-input hello world
scroll to footer
wait 2000
```

### Narration Generation

- Click **"AI Generate"** on any step
- Gemini 2.0 Flash writes professional narration based on step title + context
- Falls back to template if no API key is set

### Voice Over

- Type or paste narration text
- Select voice and style
- Click **Preview** to hear it
- Click **Generate** to create the audio file

### Export Options

| Option | Output | Use Case |
|--------|--------|----------|
| Export for NotebookLM | `.docx` with screenshots + narration | Upload to NotebookLM for AI video |
| Export Video | `.mp4` stitched from screenshots + audio | Direct video file |
| Export Web | Embeddable HTML widget | Embed in website/docs |

---

## 📡 API Documentation

### POST `/api/wizard/start`
Launches a visible Puppeteer browser and navigates to the given URL. Saves session to `.puppeteer_session`.
```json
{ "url": "https://www.printpilot.ca" }
```

### POST `/api/wizard/capture`
Takes a screenshot of the current browser state and returns it as base64.
```json
{ "stepTitle": "Dashboard Overview" }
```

### POST `/api/wizard/stop`
Closes the browser session and deletes `.puppeteer_session`.

### POST `/api/capture`
Auto-captures screenshots for all steps using headless Puppeteer.
```json
{
  "url": "https://app.example.com",
  "steps": [...],
  "headless": true,
  "loginWaitTime": 0
}
```

### POST `/api/generate-narration`
Calls Gemini 2.0 Flash to generate narration.
```json
{ "title": "Step title", "action": "navigate to /dashboard", "context": "PrintPilot User Guide" }
```
Returns `{ "success": true, "narration": "...", "source": "gemini" | "template" | "fallback" }`

### POST `/api/export`
Builds and returns a `.docx` file.
```json
{ "projectName": "My Guide", "steps": [...] }
```

### POST `/api/export/video`
Stitches screenshots + audio into an MP4 using FFmpeg.

### POST `/api/voice-preview`
Generates a short TTS preview audio clip.

### POST `/api/project/save` / GET `/api/project/load`
Persists project state to/from `project_data.json` on disk.

---

## 📁 File Structure

```
training-video-generator/
├── electron/
│   ├── main.js              # Electron main process
│   └── preload.js           # Electron preload (context bridge)
├── scripts/
│   ├── build-electron.js    # Full Windows build pipeline
│   ├── generate-icon.js     # App icon generator
│   └── installer.iss        # Inno Setup installer script
├── src/
│   ├── app/
│   │   ├── page.tsx         # Main UI — all state + handlers
│   │   ├── layout.tsx       # Root layout
│   │   ├── globals.css      # Global styles (glassmorphism theme)
│   │   ├── view/page.tsx    # Standalone step viewer page
│   │   └── api/
│   │       ├── capture/route.ts
│   │       ├── analyze-page/route.ts
│   │       ├── generate-narration/route.ts
│   │       ├── export/route.ts          # .docx export
│   │       ├── export/video/route.ts    # MP4 export
│   │       ├── export/web/route.ts      # Embed widget export
│   │       ├── voice-preview/route.ts
│   │       ├── upload-audio/route.ts
│   │       ├── upload-music/route.ts
│   │       ├── project/save/route.ts
│   │       ├── project/load/route.ts
│   │       └── wizard/
│   │           ├── start/route.ts
│   │           ├── stop/route.ts
│   │           ├── capture/route.ts
│   │           └── video/start|stop/route.ts
│   ├── components/
│   │   ├── StepEditor.tsx       # Step form with AI + voice controls
│   │   ├── PreviewPanel.tsx     # Live document preview
│   │   ├── VoiceOverModal.tsx   # Voice Over Studio modal
│   │   └── WizardOverlay.tsx    # Floating wizard capture toolbar
│   └── lib/
│       ├── browser-session.ts   # Puppeteer session manager + Xvfb
│       ├── tts-engine.ts        # Kokoro TTS + Edge TTS
│       ├── video-stitcher.ts    # FFmpeg MP4 builder
│       ├── video-recorder.ts    # Screen recorder
│       ├── video-analysis.ts    # Gemini vision analysis
│       ├── paths.ts             # Cross-platform path resolver
│       ├── export-template.html # Web embed template
│       └── tts-worker.js        # TTS web worker
├── public/
│   ├── embed-widget.js          # Embeddable widget script
│   ├── audio/                   # Generated narration + recording files
│   ├── music/                   # Background music files
│   ├── recordings/              # Screen recording outputs
│   └── exports/videos/          # Exported MP4 files
├── dist-electron/               # Build output (not committed)
│   └── TVG-win32-x64/
│       └── Training Video Generator.exe
├── .env.local                   # API keys (not committed)
├── .npmrc                       # legacy-peer-deps=true (Vercel/npm fix)
├── next.config.js
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── copilot_instructions.md      # AI assistant rules for this project
```

---

## 🔨 Building the Windows Exe

### Full Build Command

```bash
# From the project root
rm -rf .next dist-electron
node scripts/build-electron.js
```

This runs 4 steps:
1. **Next.js production build** (`npm run build`) — compiles TypeScript, generates `.next/`
2. **Electron packager** — bundles into `dist-electron/TVG-win32-x64/`
3. **Cleanup** — removes test dirs, `.map` files, `.d.ts` files to reduce size and fix Windows MAX_PATH
4. **Chromium bundle** — copies Puppeteer's cached Chromium into `.chromium/` inside the app

### Important: Chromium Platform Mismatch

**Problem:** The build runs on Linux (Codespace), so it bundles the **Linux** Chromium binary. Windows cannot run this.

**Current fix (in `electron/main.js`):** At app startup, `setupPuppeteerChromium()` detects if the bundled Chromium is for the wrong platform. If so, it sets `PUPPETEER_CACHE_DIR` to the user's AppData folder and Puppeteer **auto-downloads the correct Windows binary on first launch** (~150 MB, one-time only).

**Long-term fix:** Use GitHub Actions to run the build on a Windows runner natively, which will bundle Windows Chromium directly.

### Build Output

```
dist-electron/TVG-win32-x64/
├── Training Video Generator.exe   ← Launch this
├── resources/
│   └── app/
│       ├── .next/                 ← Next.js production build
│       ├── node_modules/          ← Pruned dependencies
│       ├── .chromium/             ← Bundled Chromium (Linux — see note above)
│       ├── electron/
│       ├── src/
│       └── ...
└── [Electron runtime DLLs]
```

### Releasing to GitHub

```bash
# Zip and upload as a GitHub Release
cd dist-electron
zip -r TVG-win32-x64.zip TVG-win32-x64/
cd ..
gh release create v1.x.x dist-electron/TVG-win32-x64.zip \
  --title "Training Video Generator v1.x.x" \
  --notes "Release notes here"
```

Latest release: https://github.com/3thirty3gitter/training-video-generator/releases/tag/v1.0.1

---

## 🐛 Known Issues & Fixes Applied

### Session History (April 12, 2026)

| Issue | Root Cause | Fix Applied |
|-------|-----------|-------------|
| Vercel build ERESOLVE error | `puppeteer-screen-recorder@3.0.6` declares peer dep on `puppeteer@19` but project uses `puppeteer@21` | Added `.npmrc` with `legacy-peer-deps=true` |
| Wizard 500 error in Codespace | No `$DISPLAY` set, Puppeteer with `headless: false` crashes | Auto-start Xvfb virtual display on `:99` before launch in `browser-session.ts` |
| Xvfb timing — browser launches before display ready | `spawn()` is fire-and-forget | Made `ensureDisplay()` async, added 1.5s wait after spawn |
| `$DISPLAY` env var not picked up | Next.js server inherits stale/empty `DISPLAY` value | Always force `process.env.DISPLAY = ':99'`, check if Xvfb already running via `pgrep` |
| Windows exe: browser won't open (500 error) | `ensureDisplay()` called Linux commands (`pgrep`, `Xvfb`, `pkill`) on Windows | Added `if (process.platform === 'win32') return` at top of `ensureDisplay()` |
| Windows exe: browser window renders black/broken | `--disable-gpu` flag was set for all platforms | Removed `--disable-gpu` on Windows: `...(isWindows ? [] : ['--disable-gpu'])` |
| Wrong Chromium bundled (Linux binary on Windows) | Build runs on Linux, copies Linux chrome | `setupPuppeteerChromium()` in `electron/main.js` detects platform mismatch and falls back to auto-download |
| `.next/export` dir not empty error on rebuild | Stale `.next` from previous run | Always `rm -rf .next` before rebuilding |

### Session History (April 13, 2026)

| Issue | Root Cause | Fix Applied |
|-------|-----------|-------------|
| Wizard API returns success but browser never opened | `pgrep -f "Xvfb :99"` matched **its own shell command** (the string `"Xvfb :99"` appears in the `execSync` shell invocation), causing a false positive — `ensureDisplay()` always skipped starting Xvfb | Replaced `pgrep` check with `xdpyinfo -display :99`, which actually connects to the display server. Added a poll loop (up to 8s) instead of fixed 1.5s wait. In `browser-session.ts` `ensureDisplay()`. |

---

## ❌ Why Vercel Does Not Work

This app **cannot run on Vercel** (or any serverless platform). Here's why:

1. **Puppeteer needs a real browser** — Vercel serverless functions cannot launch Chromium
2. **No persistent file system** — The app writes audio, screenshots, and video files to disk. Vercel's filesystem is ephemeral and read-only at runtime.
3. **Execution time limits** — Vercel free tier: 10s max. Video stitching, TTS generation, and screen recording take much longer.
4. **No installed system tools** — FFmpeg and Xvfb are system binaries. They don't exist in Vercel's sandbox.

The `.npmrc` `legacy-peer-deps=true` was added to fix Vercel's `npm install` failure, but the app itself still cannot run there. Vercel can only serve the UI — all the heavy features will 500.

---

## ✅ Deployment Options That DO Work

### 1. Windows Desktop App (Current — Recommended)
Download from GitHub Releases. Double-click the `.exe`. Everything runs locally on the user's machine.

- **Pros:** Full features, no server needed, completely free to run
- **Cons:** Windows only (can build Mac/Linux versions separately)

### 2. GitHub Codespace / Dev Container
Run `npm run dev` in the Codespace. Access at the forwarded port.
- Wizard requires the Xvfb setup (already handled automatically)
- Good for development and testing

### 3. VPS / Dedicated Server (Linux)
```bash
# Ubuntu setup
sudo apt-get install -y nodejs npm xvfb
git clone https://github.com/3thirty3gitter/training-video-generator.git
cd training-video-generator
npm install
npm run build

# Run with display
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 -ac &
npm start
```
Use **PM2** for process management. Access via port 3456 (configure reverse proxy on 80/443).

### 4. Railway / Render
- Set build command: `npm run build`
- Set start command: `npm start`
- Add `GEMINI_API_KEY` environment variable
- Note: Wizard (visible browser) won't work without Xvfb setup on the host

---

## 🛒 Future: SaaS + Licence Key System

**Status: Not yet built — planned next**

The goal is to sell this tool with licence keys so customers can activate and use the Windows app.

### Recommended Architecture

```
┌─────────────────────────────────────────────────────┐
│           Licence Server (separate Next.js app)      │
│  - Hosted on Railway or VPS                          │
│  - Stripe checkout integration                       │
│  - Licence key generation (UUID or custom format)    │
│  - Key validation API endpoint                       │
│  - Customer dashboard (view/revoke keys)             │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│           Training Video Generator .exe              │
│  - On first launch: show licence key input screen    │
│  - POST licence key to licence server for validation │
│  - If valid: store key in %APPDATA%/tvg/licence.dat  │
│  - On each launch: silently re-validate key          │
│  - If invalid/expired: show "Please renew" screen    │
└─────────────────────────────────────────────────────┘
```

### Implementation Plan

1. **Licence Server** — New repo / Next.js app:
   - Stripe webhook → generate UUID key → store in database (PlanetScale / Supabase)
   - `POST /api/validate` → accepts key, returns `{ valid: true, plan: "pro", expiresAt: "..." }`
   - `POST /api/activate` → first-time machine binding (optional — bind key to machine fingerprint)

2. **App Changes** — In `electron/main.js`:
   - Check for stored licence key on startup
   - If missing: load a `licence-gate.html` page instead of the main app
   - If present: validate against server silently in background
   - If server unreachable: allow offline grace period (e.g. 7 days)

3. **Key Storage** — Use `electron-store` or write to `app.getPath('userData')/licence.json` (encrypted with a local secret)

4. **Pricing Ideas**
   - One-time purchase: $49-99 per seat
   - Annual subscription: $29/year with updates
   - Team licence: $149/year for 5 seats

---

## 📦 Dependencies

### Key Production Dependencies

```json
{
  "next": "^14.1.0",
  "react": "^18.2.0",
  "puppeteer": "^21.11.0",
  "@google/generative-ai": "^0.24.1",
  "kokoro-js": "^1.2.1",
  "fluent-ffmpeg": "^2.1.3",
  "@ffmpeg-installer/ffmpeg": "^1.1.0",
  "puppeteer-screen-recorder": "^3.0.6",
  "docx": "^8.5.0",
  "msedge-tts": "^2.0.4",
  "uuid": "^13.0.0"
}
```

### Key Dev / Build Dependencies

```json
{
  "electron": "^41.1.0",
  "electron-packager": "^17.1.2",
  "typescript": "^5.3.3",
  "tailwindcss": "^3.4.1",
  "concurrently": "^9.2.1"
}
```

### `.npmrc` Note

The file `.npmrc` contains `legacy-peer-deps=true`. This is required because `puppeteer-screen-recorder@3.0.6` declares a peer dependency on `puppeteer@19` but the project uses `puppeteer@21`. The packages are compatible at runtime — this is just a version declaration mismatch in the library's `package.json`.

---

## 🔍 Troubleshooting

### Browser won't open (Windows exe)

**Symptom:** Wizard Start returns 500: `Failed to launch the browser process`

**Cause 1 — Wrong Chromium:** Check the log. If you see `Bundled Chromium is for a different platform`, Puppeteer is auto-downloading the correct Windows binary. Wait 1-2 minutes on first use — it downloads ~150 MB to `%APPDATA%\training-video-generator\chromium`.

**Cause 2 — Missing Chromium entirely:** Open `%APPDATA%\training-video-generator\` and check if a `chromium` folder exists. If not, Puppeteer needs to download it. Ensure you have internet access on first launch.

**Cause 3 — Antivirus blocking:** Windows Defender or AV software may block `chrome.exe` inside the app's node_modules. Add the app folder to AV exclusions.

### Browser won't open (Codespace / Linux)

**Symptom:** `Missing X server or $DISPLAY`

**Fix:** The app auto-starts Xvfb. If it's still failing, manually start it:
```bash
Xvfb :99 -screen 0 1920x1080x24 -ac &
export DISPLAY=:99
```
Then restart the dev server.

### AI narration returns "template" fallback

**Cause:** `GEMINI_API_KEY` not set or invalid.

**Fix:** Create or update `.env.local`:
```
GEMINI_API_KEY=AIza...your key here
```
Restart the dev server. Get a free key at https://aistudio.google.com/app/apikey

### Project data not saving

**Cause:** The app writes to `project_data.json` in the working directory. In Electron production this is inside `resources/app/`.

**Fix:** This is handled automatically by `paths.ts` — it routes to `TVG_USER_DATA` (AppData) in production. If data seems lost, check `%APPDATA%\training-video-generator\project_data.json` on Windows.

### Build fails with `ENOTEMPTY: directory not empty`

**Fix:**
```bash
rm -rf .next dist-electron
node scripts/build-electron.js
```

### npm install fails with ERESOLVE

**Fix:** Ensure `.npmrc` exists in the project root with `legacy-peer-deps=true`.

---

## 🛠️ Support & Maintenance

### copilot_instructions.md

This file contains critical rules for the AI coding assistant. **It must always be followed.** Key rules:
- **Red Line Rule** — Only touch the exact lines needed for a task
- **No cleanup** — No refactoring, no removing "unused" imports, no reformatting
- **Input color rule** — Every `<input>`, `<textarea>`, `<select>` must have `style={{ color: '#000000' }}`

### Git Workflow

```bash
# Always pull before working
git pull origin main

# After changes
git add .
git commit -m "brief description of change"
git push origin main
```

### Release Workflow

```bash
rm -rf .next dist-electron
node scripts/build-electron.js
cd dist-electron
zip -r TVG-win32-x64.zip TVG-win32-x64/
cd ..
gh release create vX.X.X dist-electron/TVG-win32-x64.zip \
  --title "Training Video Generator vX.X.X" \
  --notes "What changed"
```

### Current Releases

| Version | Date | Notes |
|---------|------|-------|
| v1.0.0 | April 12, 2026 | First Windows build — browser launch broken (wrong Chromium) |
| v1.0.1 | April 12, 2026 | Fixed: Windows platform detection, correct Chromium fallback, `--disable-gpu` removed on Windows |
| v1.0.2 | April 13, 2026 | Fixed: Wizard browser never opened in Codespace — `pgrep` false positive in `ensureDisplay()` replaced with `xdpyinfo` real display check |


---

