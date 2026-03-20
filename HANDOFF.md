# Training Video Generator Pro — Handoff Documentation

**Project:** SaaS Training Video Generator  
**Repository:** https://github.com/3thirty3gitter/training-video-generator  
**Created:** January 2026  
**Last Updated:** March 20, 2026  
**Status:** In Development — Deploying to Vercel

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technical Architecture](#technical-architecture)
3. [Getting Started](#getting-started)
4. [File Structure](#file-structure)
5. [API Routes Reference](#api-routes-reference)
6. [Components Reference](#components-reference)
7. [Lib Modules Reference](#lib-modules-reference)
8. [TTS Engine Details](#tts-engine-details)
9. [Video Pipeline](#video-pipeline)
10. [Dependencies](#dependencies)
11. [Deployment (Vercel)](#deployment-vercel)
12. [Environment Variables](#environment-variables)
13. [Current Project State](#current-project-state)
14. [Known Issues](#known-issues)
15. [Future Enhancements](#future-enhancements)

---

## Project Overview

### What It Does

This tool automates the creation of training tutorial videos for SaaS products. The full workflow:

1. **Open a target web app** in a Puppeteer-controlled browser (interactive wizard mode, or batch capture)
2. **Record screen interactions** as video clips or take snapshots per step
3. **Generate AI narration scripts** using Google Gemini (vision-capable — analyzes screenshots/video)
4. **Synthesize speech** via Google TTS, Kokoro neural TTS, or user-recorded voice-overs
5. **Stitch everything** into a final MP4 with FFmpeg (with optional captions, transitions, background music)
6. **Export** as standalone HTML guide, Word document (for NotebookLM upload), or rendered video

### Primary Use Case

**PrintPilot.ca** — creating onboarding, feature tutorials, and marketing videos for this print management SaaS platform. Designed to be reusable for any SaaS product.

### Key Features

- **Interactive Wizard** — Puppeteer opens a real browser, user interacts naturally, clicks a floating button to capture each step (snapshot or video recording with virtual cursor + click ripple effects)
- **Batch Capture** — Define steps with CSS selectors and actions, auto-capture all screenshots at once
- **AI Narration** — Gemini 2.5 Flash vision analyzes screenshots/video to write contextual narration (persona: "Creator and Lead Architect" with 20+ years experience)
- **Multi-Voice TTS** — 7 Kokoro neural voices (high quality), 14 Edge/Google TTS character profiles with pitch shifting, EQ, and style modifiers
- **Voice-Over Studio** — Record your own narration via microphone with a built-in teleprompter showing the script text, synced with video playback
- **Video Rendering** — Full FFmpeg pipeline assembles individual step clips into a final MP4 with captions, fade transitions, and background music mixing
- **Multiple Export Formats** — MP4 video, standalone HTML guide, downloadable Word document, embeddable widget
- **Auto-Save** — Project state persists to disk (`project_data.json`) with debounced auto-save
- **Live Preview** — Interactive tutorial viewer at `/view`, document preview in sidebar

---

## Technical Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 14 | React frontend + API routes |
| Styling | Tailwind CSS 3.4 | UI design |
| Browser Automation | Puppeteer 21 | Navigate target apps, capture screenshots/video |
| Screen Recording | puppeteer-screen-recorder 3 | Record browser tab as MP4 |
| AI | Google Gemini 2.0/2.5 Flash | Vision analysis, narration generation |
| TTS | google-tts-api, Kokoro ONNX (Python), msedge-tts | Speech synthesis |
| Video Processing | FFmpeg (via fluent-ffmpeg) | Audio conversion, DSP, video stitching |
| Document Gen | docx 8.5 | Word document export |
| Icons | Lucide React | UI icons |
| Runtime | Node.js 20+ | Server runtime |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│                                                                  │
│  page.tsx ──── StepEditor ──── PreviewPanel                     │
│      │          │                                                │
│      │          ├── VoiceOverModal (mic recording + teleprompter)│
│      │          │                                                │
│      └── WizardOverlay (interactive capture state machine)       │
│                                                                  │
│  /view ── Read-only tutorial viewer                              │
└───────────────────────┬─────────────────────────────────────────┘
                        │
          ┌─────────────┼──────────────────┐
          ▼             ▼                  ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│ Wizard APIs  │ │ Content APIs │ │ Export APIs       │
│              │ │              │ │                   │
│ /wizard/     │ │ /capture     │ │ /export (DOCX)    │
│   start      │ │ /analyze-page│ │ /export/video     │
│   stop       │ │ /generate-   │ │ /export/web       │
│   capture    │ │  narration   │ │ /voice-preview    │
│   video/     │ │ /project/    │ │ /upload-audio     │
│    start     │ │  load/save   │ │ /upload-music     │
│    stop      │ │              │ │                   │
└──────┬───────┘ └──────┬───────┘ └────────┬──────────┘
       │                │                   │
       ▼                ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Server-Side Libs                          │
│                                                                  │
│  browser-session.ts  ── Singleton Puppeteer browser manager      │
│  video-recorder.ts   ── puppeteer-screen-recorder wrapper        │
│  video-analysis.ts   ── Gemini video file analysis               │
│  tts-engine.ts       ── Multi-engine TTS with DSP processing     │
│  video-stitcher.ts   ── FFmpeg render pipeline                   │
│  tts-worker.js       ── Edge TTS child process (alternative)     │
│  generate_kokoro.py  ── Kokoro neural TTS (Python ONNX)          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────────┐
        │ Puppeteer│ │  FFmpeg  │ │ Gemini AI    │
        │ (Chrome) │ │ (local)  │ │ (API)        │
        └──────────┘ └──────────┘ └──────────────┘
```

### Data Flow

```
User defines project → Auto-saved to project_data.json on disk
                     ↓
Interactive Wizard or Batch Capture
  → Puppeteer opens target site
  → Records video clips / takes screenshots per step
  → Gemini vision analyzes media → generates narration scripts
                     ↓
User refines narration (edit text, or record voice-over)
                     ↓
Render Video:
  → TTS engine generates audio per step (or uses custom recordings)
  → video-stitcher.ts assembles clips + audio + captions + music
  → Final MP4 written to public/exports/videos/
                     ↓
Export:
  → MP4 video (rendered)
  → Standalone HTML guide (self-contained, Tailwind CDN)
  → Word DOCX (for NotebookLM upload)
  → Embeddable widget (embed-widget.js)
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+ (developed on 24.2.0)
- **npm** 10+
- **Python 3** with `kokoro-onnx`, `soundfile`, `numpy` (only needed for Kokoro neural voices)
- **Google Gemini API Key** (required for AI narration — free tier: 15 req/min)
- **Chrome/Chromium** (Puppeteer downloads its own, but visible mode uses the local install)

### Installation

```bash
git clone https://github.com/3thirty3gitter/training-video-generator.git
cd training-video-generator
npm install
```

### Environment Setup

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Gemini API key:
```
GEMINI_API_KEY=AIzaSy...your_key_here
```

Get a free key at https://aistudio.google.com/app/apikey

### Run Development Server

```bash
npm run dev
```

Open **http://localhost:3000**

## File Structure

```
training-video-generator/
├── .gitignore
├── .npmrc                                  # legacy-peer-deps=true (Vercel fix)
├── .env.example                            # GEMINI_API_KEY template
├── generate_kokoro.py                      # Python Kokoro ONNX TTS script
├── next.config.js                          # Next.js config (10mb body limit)
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── project_data.json                       # Auto-saved project state (gitignored: no)
├── HANDOFF.md                              # This document
│
├── public/
│   ├── embed-widget.js                     # Embeddable tutorial widget for external sites
│   ├── audio/
│   │   ├── narration/                      # Generated TTS audio files (MP3)
│   │   └── recordings/                     # User voice-over recordings (WebM)
│   ├── music/                              # 6 background music tracks (MP3)
│   │   ├── upbeat.mp3
│   │   ├── modern.mp3
│   │   ├── lofi.mp3
│   │   ├── groove.mp3
│   │   ├── cinematic.mp3
│   │   └── piano.mp3
│   └── recordings/                         # Wizard screen recordings (MP4, gitignored)
│
├── src/
│   ├── app/
│   │   ├── globals.css                     # Tailwind + radial gradient bg + custom scrollbar
│   │   ├── layout.tsx                      # Root layout (Inter font)
│   │   ├── page.tsx                        # Main app — 22 state vars, sidebar + editor
│   │   │
│   │   ├── view/
│   │   │   └── page.tsx                    # Read-only interactive tutorial viewer
│   │   │
│   │   └── api/
│   │       ├── analyze-page/route.ts       # Puppeteer page analysis + Gemini vision
│   │       ├── capture/route.ts            # Batch screenshot automation
│   │       ├── generate-narration/route.ts # Gemini 2.5 Flash narration (vision-capable)
│   │       ├── voice-preview/route.ts      # TTS sample audio generation
│   │       ├── upload-audio/route.ts       # User voice-over upload (WebM)
│   │       ├── upload-music/route.ts       # Replace background music track
│   │       │
│   │       ├── project/
│   │       │   ├── load/route.ts           # GET: load from disk / POST: clear
│   │       │   └── save/route.ts           # POST: save to project_data.json
│   │       │
│   │       ├── export/
│   │       │   ├── route.ts                # DOCX Word document export
│   │       │   ├── video/route.ts          # Full video render pipeline
│   │       │   └── web/route.ts            # Standalone HTML guide export
│   │       │
│   │       └── wizard/
│   │           ├── start/route.ts          # Start persistent browser session
│   │           ├── stop/route.ts           # Close browser session
│   │           ├── capture/route.ts        # Snapshot/video capture with UI injection
│   │           └── video/
│   │               ├── start/route.ts      # Start screen recording
│   │               └── stop/route.ts       # Stop recording + Gemini video analysis
│   │
│   ├── components/
│   │   ├── StepEditor.tsx                  # Step editing form + AI narration button
│   │   ├── PreviewPanel.tsx                # Document preview (read-only)
│   │   ├── VoiceOverModal.tsx              # Mic recording studio + teleprompter
│   │   └── WizardOverlay.tsx               # Interactive capture state machine
│   │
│   └── lib/
│       ├── browser-session.ts              # Singleton Puppeteer browser manager
│       ├── video-recorder.ts               # puppeteer-screen-recorder wrapper
│       ├── video-analysis.ts               # Gemini video file analysis
│       ├── tts-engine.ts                   # Multi-engine TTS + DSP processing
│       ├── video-stitcher.ts               # FFmpeg render pipeline
│       ├── tts-worker.js                   # Edge TTS child process (alternative)
│       └── export-template.html            # Standalone HTML guide template
```

---

## API Routes Reference

### Wizard (Interactive Capture)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/wizard/start` | POST | Launch persistent Puppeteer browser, navigate to URL |
| `/api/wizard/stop` | POST | Close browser session |
| `/api/wizard/capture` | POST | Poll for user interaction (snapshot or video mode) |
| `/api/wizard/video/start` | POST | Start screen recording with REC timer overlay |
| `/api/wizard/video/stop` | POST | Stop recording, analyze video with Gemini |

**Wizard Capture Details** (`/api/wizard/capture`):
- Accepts `{ mode: 'snapshot' | 'video', reset?: boolean }`
- Injects floating UI buttons into the target page
- Injects **virtual cursor** (yellow circle with lerp smoothing) and **click ripple effects** (red expanding ring)
- Polls for `_GEMINI_WIZARD_INTERACTION` window variable every 1s (max 10 min)
- On snapshot: takes screenshot + Gemini vision analysis
- On video start/stop: delegates to video-recorder

### Content

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/capture` | POST | Batch screenshot automation (headless, CSS selector actions) |
| `/api/analyze-page` | POST | Open URL in visible browser, inject capture button, Gemini analysis |
| `/api/generate-narration` | POST | Gemini 2.5 Flash narration (with optional screenshot vision) |
| `/api/voice-preview` | POST | Generate TTS sample audio clip |
| `/api/upload-audio` | POST | Save user-recorded voice-over (FormData → WebM) |
| `/api/upload-music` | POST | Replace a background music track slot (FormData) |

### Project Persistence

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/project/load` | GET | Read project_data.json from disk |
| `/api/project/load` | POST | Clear/delete project_data.json |
| `/api/project/save` | POST | Write project state to project_data.json |

### Export

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/export` | POST | Generate Word DOCX (for NotebookLM upload) |
| `/api/export/video` | POST | Full video render (TTS + FFmpeg stitching) |
| `/api/export/web` | GET | Standalone HTML guide download |

---

## Components Reference

### `StepEditor.tsx`

**Props:** `step`, `onUpdate`, `onGenerateNarration`, `isGenerating`

The main editing form for a single step:
- Step title input
- Action/selector input
- Wait time selector
- AI context/keywords field
- Narration textarea with **"AI Generate Script"** button (sends step + captured video frame to Gemini)
- Voice-over section with **"Open Studio"** button → opens VoiceOverModal
- Screenshot/video preview

For video steps, captures a JPEG frame from the video element to provide visual context to the narration AI.

### `PreviewPanel.tsx`

**Props:** `steps`, `currentStepId`

Read-only document preview showing all steps as a scrollable document. Highlights the currently selected step. Shows how the tutorial will look when exported.

### `WizardOverlay.tsx`

**Props:** `isOpen`, `onClose`, `onAddStep`, `initialUrl`

Full-screen modal with a **state machine** (`idle → starting → waiting-for-user → recording → analyzing → review → error`):

- **Idle:** URL input + capture mode toggle (Snapshot/Video)
- **Starting:** Loading spinner
- **Waiting:** Animated icon + instructions ("Click the button in your browser")
- **Recording:** 30-second countdown timer with stop button
- **Analyzing:** Gemini processing spinner
- **Review:** Preview captured result + AI narration, "Add this Step" or "Dismiss"
- **Error:** Retry UI

Footer has a live log terminal (last 50 entries). Keyboard shortcuts: Space/Enter for interactions.

### `VoiceOverModal.tsx`

**Props:** `isOpen`, `onClose`, `step`, `onSave`

Full-screen "Voice Over Studio" modal:
- Step video/screenshot as background reference
- Record audio via `getUserMedia`
- Controls: Record, Stop, Play (synced with muted video), Retake, Save
- **Teleprompter** at bottom showing narration text in large font for reading while recording
- Output: WebM audio blob

---

## Lib Modules Reference

### `browser-session.ts`

Manages a **singleton Puppeteer browser** instance for the interactive wizard:
- `createBrowserSession()` — Launch Puppeteer (visible, non-headless), save WebSocket endpoint to `.puppeteer_session` file
- `getBrowserSession()` — Get existing browser or reconnect via saved endpoint
- `closeBrowserSession()` — Close browser, delete session file
- Uses `.puppeteer_data/` for persistent user data (cookies, localStorage)

### `video-recorder.ts`

Wrapper around `puppeteer-screen-recorder`:
- `startRecording(page)` — Record current page at 20 FPS, 1280x720, saves to `public/recordings/`
- `stopRecording()` — Stop and return file path
- `isRecording()` — Check state
- Singleton pattern (one recording at a time)
- Uses local FFmpeg binary from `@ffmpeg-installer`

### `video-analysis.ts`

Gemini-powered video analysis:
- `processAndAnalyzeVideo()` — Stop recording, upload MP4 to Google AI File Manager, poll for processing, ask Gemini 2.0 Flash to generate 2-sentence narration from the video content, cleanup remote file
- Falls back to "Video action recorded successfully." if AI fails

### `tts-engine.ts`

Multi-engine text-to-speech with DSP processing:
- `generateNarrationAudio(id, text, characterId, style, speed)` → returns audio file path

**Engines (selected by voice ID prefix):**

| Prefix | Engine | Quality | Details |
|--------|--------|---------|---------|
| `kokoro-` | Kokoro ONNX (Python) | High neural | Calls `generate_kokoro.py` via child_process, outputs WAV → MP3 |
| `us-`, `uk-`, `au-`, `in-` | Google TTS | Standard | Uses google-tts-api with regional TLD, then FFmpeg DSP processing |

**DSP Processing (Google TTS):**
- Pitch shifting via `asetrate` + `atempo` compensation
- EQ boost (treble/bass per character)
- Speed control via `atempo`
- Style modifiers: cheerful (+5% pitch, 1.1x), serious (-5% pitch, 0.9x), business variants

**14 Character Profiles:** us-aria, us-guy, us-jenny, us-christopher, us-eric, us-michelle, us-roger, uk-sonia, uk-ryan, uk-libby, uk-abbi, au-natasha, au-william, in-neerja, in-prabhat

**Note:** Google TTS truncates text to 199 characters. File caching: skips generation if output file already exists.

### `video-stitcher.ts`

FFmpeg render pipeline:
- `stitchTutorialVideo(projectName, steps, audioPaths, includeCaptions, transitionType, backgroundMusic, musicVolume)` → returns output video path

**Pipeline:**
1. For each step: create individual clip (video source or image loop + audio)
2. Scale/pad to 1920x1080
3. Optional fade in/out transitions
4. Optional `drawtext` captions (word-wrapped at 60 chars, written to temp text file)
5. Concatenate all clips via `ffmpeg.mergeToFile()`
6. If background music: second pass mixes music (looped, volume-adjusted) with `amix`
7. Output: `public/exports/videos/tutorial-{timestamp}.mp4`

### `tts-worker.js`

Standalone Node.js script for Microsoft Edge TTS (via `msedge-tts` package). Called as child process with SSML input. **Currently unused** — exists as an alternative TTS path.

### `export-template.html`

Self-contained HTML template for the downloadable web guide. Includes Tailwind CDN, Lucide icons, step navigation (prev/next), progress dots, video/image display. Uses `{{PROJECT_NAME}}` and `{{PROJECT_STEPS}}` template variables.

---

## TTS Engine Details

### Kokoro Neural Voices (High Quality)

7 voices available via Python ONNX runtime:

| Voice ID | Name | Accent |
|----------|------|--------|
| `kokoro-af_sarah` | Sarah | US Female |
| `kokoro-af_nicole` | Nicole | US Female |
| `kokoro-af_bella` | Bella | US Female |
| `kokoro-am_michael` | Michael | US Male |
| `kokoro-am_adam` | Adam | US Male |
| `kokoro-bf_emma` | Emma | UK Female |
| `kokoro-bm_george` | George | UK Male |

**Requirements:** Python 3 with `kokoro-onnx`, `soundfile`, `numpy`. Downloads model files (~80MB) on first use.

### Google TTS Voices (DSP-Enhanced)

14 character profiles using Google Translate TTS with post-processing:

Each character has: regional TLD (com, co.uk, com.au, co.in), pitch multiplier, EQ preset (treble/bass boost)

**Tone Modifiers:** normal, cheerful (3 variants), serious (3 variants), business (3 variants)  
**Speed Options:** 0.75x, 1.0x, 1.1x, 1.25x, 1.5x

---

## Video Pipeline

### Render Flow (triggered by `/api/export/video`)

```
project_data.json
    │
    ├── For each step:
    │   ├── Has customAudioUrl? → Use user recording
    │   └── No? → tts-engine.ts generates TTS audio
    │
    ├── video-stitcher.ts:
    │   ├── Step clips: video source or image + audio → 1920x1080
    │   ├── Optional: fade transitions between clips
    │   ├── Optional: drawtext captions (bottom center, semi-transparent bg)
    │   ├── Concatenate all clips
    │   └── Optional: mix in background music (looped, volume-adjusted)
    │
    └── Output: public/exports/videos/tutorial-{timestamp}.mp4
```

### FFmpeg Path Resolution

FFmpeg and FFprobe binaries are resolved from `node_modules/@ffmpeg-installer/` and `@ffprobe-installer/`:
- Windows: `win32-x64/ffmpeg.exe`
- Linux: `linux-x64/ffmpeg`
- **macOS: Not currently supported** (no darwin path handling)

---

## Dependencies

### Production

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| `next` | ^14.1.0 | React framework | Active |
| `react` / `react-dom` | ^18.2.0 | UI library | Active |
| `puppeteer` | ^21.11.0 | Browser automation | Deprecated (24.15+ recommended) |
| `puppeteer-screen-recorder` | ^3.0.6 | Screen recording | Peer dep conflict (needs puppeteer 19) |
| `@google/generative-ai` | ^0.24.1 | Gemini AI SDK | Active |
| `fluent-ffmpeg` | ^2.1.3 | FFmpeg command builder | Deprecated upstream |
| `@ffmpeg-installer/ffmpeg` | ^1.1.0 | Local FFmpeg binary | Active |
| `@ffprobe-installer/ffprobe` | ^2.1.2 | Local FFprobe binary | Active |
| `docx` | ^8.5.0 | Word document generation | Active |
| `google-tts-api` | ^2.0.2 | Google Translate TTS | Active |
| `msedge-tts` | ^2.0.4 | Microsoft Edge TTS | In deps but unused in main flow |
| `kokoro-js` | ^1.2.1 | Kokoro TTS (JS) | In deps but Python script used instead |
| `lucide-react` | ^0.344.0 | Icon library | Active |
| `uuid` | ^13.0.0 | Unique filenames | Active |
| `sharp` | ^0.34.5 | Image processing | In deps, not imported anywhere |
| `@xenova/transformers` | ^2.17.2 | ML transformers | In deps, not imported anywhere |
| `wavefile` | ^11.0.0 | WAV processing | In deps, not imported anywhere |
| `html-to-docx` | ^1.8.0 | HTML→Word converter | In deps, not used |
| `dotenv` | ^17.2.3 | Env var loading | In deps |

### Dev

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.3.3 | TypeScript compiler |
| `@types/node` | ^20.11.17 | Node.js types |
| `@types/react` | ^18.2.55 | React types |
| `@types/react-dom` | ^18.2.19 | React DOM types |
| `@types/fluent-ffmpeg` | ^2.1.28 | FFmpeg types |
| `@types/uuid` | ^10.0.0 | UUID types |
| `tailwindcss` | ^3.4.1 | CSS framework |
| `postcss` | ^8.4.35 | CSS processor |
| `autoprefixer` | ^10.4.17 | PostCSS plugin |

### Safely Removable

These packages are in `package.json` but not imported in the codebase:
- `html-to-docx` — never used
- `sharp` — never imported
- `@xenova/transformers` — never imported
- `wavefile` — never imported
- `kokoro-js` — Python script used instead

---

## Deployment (Vercel)

### Current Status

Deploying to Vercel from GitHub. The `.npmrc` file with `legacy-peer-deps=true` resolves the `puppeteer-screen-recorder` peer dependency conflict during `npm install`.

### Important Vercel Limitations

**Puppeteer will NOT work** in Vercel's serverless environment:
- Serverless functions have 50MB size limit (Chromium is ~280MB)
- No persistent filesystem (browser sessions, recordings can't be stored)
- 10-second default timeout (30s max on free tier) — too short for captures
- No visible/headed browser mode

**What WILL work on Vercel:**
- The frontend UI (page.tsx, components)
- The `/view` page
- `/api/project/load` and `/api/project/save` (if using external storage)
- `/api/generate-narration` (Gemini API call, no Puppeteer)
- `/api/export` (DOCX generation from existing data)
- `/api/export/web` (HTML template generation)

**What WON'T work on Vercel (serverless):**
- `/api/wizard/*` (needs persistent Puppeteer browser)
- `/api/capture` (needs Puppeteer)
- `/api/analyze-page` (needs Puppeteer)
- `/api/export/video` (needs FFmpeg + filesystem)
- `/api/voice-preview` (needs FFmpeg for TTS processing)
- Screen recording, video stitching

### Recommended Deployment Strategy

**Option A: Vercel for frontend + external API for heavy work**
- Deploy to Vercel for the UI and lightweight APIs
- Run Puppeteer/FFmpeg workloads on a VPS (Railway, Render, or dedicated server)

**Option B: Railway / Render (full stack)**
- Better for this app since it needs Puppeteer + FFmpeg
- Both support Docker and persistent processes
- Set build: `npm run build`, start: `npm start`

**Option C: Docker on VPS**

```dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    python3 python3-pip \
    fonts-liberation \
    libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
    libgbm1 libasound2 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | Yes (for AI features) | Google Gemini API key. Get free at https://aistudio.google.com/app/apikey |

No other environment variables are currently required. The app functions without the API key but falls back to error messages instead of AI narration.

---

## Current Project State

### Active Project: PrintPilot User Guide

- **Target URL:** https://www.printpilot.ca
- **Voice:** au-natasha (Australian female)
- **Settings:** Captions enabled, fade transitions, cinematic music at 40% volume
- **Steps:** 12 video steps captured via interactive wizard

| Step | Title | Has Video | Has Narration |
|------|-------|-----------|---------------|
| 1 | Welcome to PrintPilot | Yes | Yes (full AI narration) |
| 2-12 | Video Action | Yes | Generic fallback only |

Steps 2-12 have video recordings but their titles and narration are generic defaults ("Video Action" / "Video action recorded successfully.") — the Gemini video analysis either wasn't fully applied or failed silently for these steps.

---

## Known Issues

1. **Duplicate `TutorialStep` interface** — Defined twice in `page.tsx` (top and bottom). The bottom export includes an extra `context?: string` field. Can cause type confusion.

2. **`setIncludeCaptions` called twice** on load in `page.tsx` (lines 59-60). Harmless but redundant.

3. **Unused state variables** — `isInteractive` and `loginWaitTime` are declared in `page.tsx` but never rendered in the UI.

4. **Google TTS text truncation** — `tts-engine.ts` silently truncates narration text to 199 characters (`safeText = text.substring(0, 199)`). Long narrations will be cut off.

5. **No macOS FFmpeg support** — Hardcoded paths only handle `win32-x64` and `linux-x64`.

6. **No authentication** — All API routes are open. Designed for local/single-user use only.

7. **Puppeteer version deprecated** — v21.11.0 is deprecated. Upgrade to 24.15+ recommended.

8. **`puppeteer-screen-recorder` peer conflict** — Wants puppeteer@19, we have 21. Resolved via `.npmrc` legacy-peer-deps but may cause runtime issues.

9. **Unused npm packages** — `sharp`, `@xenova/transformers`, `wavefile`, `kokoro-js`, `html-to-docx` are installed but never imported. Adds ~100MB+ to `node_modules`.

10. **`exportToVideo` button handler** — In `page.tsx`, the "Export Guide" header button just calls `alert()` — it's not wired to the actual render pipeline (the sidebar Video button is).

---

## Future Enhancements

### High Priority

- **Fix step 2-12 narrations** — Re-run Gemini analysis on existing video recordings, or manually add meaningful titles/narration
- **Remove unused dependencies** — `sharp`, `@xenova/transformers`, `wavefile`, `kokoro-js`, `html-to-docx`
- **Wire up "Export Guide" button** — Connect header button to actual DOCX export or render
- **De-duplicate TutorialStep interface** — Single source of truth

### Medium Priority

- **Template library** — Save/load tutorial templates (localStorage or Supabase)
- **Batch narration generation** — "Generate All" button to run Gemini on all steps at once
- **Multi-language narration** — DeepL API translation
- **Video branding** — Logo overlay, intro/outro slides via Sharp + Canvas
- **Progress indicator for renders** — The video render can take minutes; show progress

### Long Term

- **Chrome extension for capture** — Record user interactions directly without Puppeteer
- **Authentication & multi-user** — NextAuth.js + Prisma + PostgreSQL
- **Cloud storage** — Replace filesystem persistence with S3/Cloud Storage
- **Serverless-compatible capture** — Puppeteer Core + Chrome AWS Lambda for Vercel

---

**Last Updated:** March 20, 2026  
**Version:** 1.1.0  
**Repository:** https://github.com/3thirty3gitter/training-video-generator
