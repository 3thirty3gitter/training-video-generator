# Training Video Generator Pro — Handoff Documentation

**Project:** SaaS Training Video Generator  
**Repository:** https://github.com/3thirty3gitter/training-video-generator  
**Created:** January 2026  
**Last Updated:** March 21, 2026  
**Status:** Deployed to Vercel — Firestore persistence integrated, debug verification pending

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
12. [Firestore Persistence](#firestore-persistence)
13. [Environment Variables](#environment-variables)
14. [Current Project State](#current-project-state)
15. [Known Issues](#known-issues)
16. [Future Enhancements](#future-enhancements)

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
- **Auto-Save** — Project state persists to Firestore (cloud) when configured, or to disk locally (`project_data.json`)
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
| Cloud Persistence | Firebase Admin SDK / Firestore | Project state (cloud) |
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
├── .gitignore                              # Ignores Firebase keys, set-vercel-env.sh, project_data.json
├── .npmrc                                  # legacy-peer-deps=true (Vercel fix)
├── .env.example                            # All env vars documented (GEMINI + FIREBASE)
├── Dockerfile                              # Multi-stage Docker build (node:20-slim + chromium + ffmpeg)
├── generate_kokoro.py                      # output: standalone, serverExternalPackages list
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── project_data.json                       # Auto-saved project state (local fallback, NOT committed)
├── HANDOFF.md                              # This document
│
├── public/
│   ├── favicon.ico                         # 16x16 app icon (fixes browser 404)
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
│       ├── firestore.ts                    # Firebase Admin SDK singleton — Firestore read/write
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
| `/api/project/load` | GET | Load project from Firestore (falls back to disk) |
| `/api/project/load` | POST | Clear/delete current project |
| `/api/project/save` | POST | Save project state to Firestore (falls back to `/tmp` on Vercel) |

### Diagnostics

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/debug` | GET | Firestore diagnostic — returns env var status, key format check, live read/write test result |

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

### `firestore.ts`

Firebase Admin SDK singleton for cloud persistence:
- **Init guard:** Calls `admin.getApp()` first; on `app/no-app` error, calls `initializeApp()`. Caches any init error in `_initError` so failed inits don't retry on every request.
- **Private key handling:** Replaces literal `\n` strings (how Vercel stores multiline env vars) with real newlines before credential construction.
- **`firestoreEnabled()`** — Returns `true` if env vars are set and init succeeded. Call this before any read/write.
- **`getFirestore()`** — Returns the `Firestore` instance, or `null` if not configured.
- **`loadProjectFromFirestore()`** — Reads `projects/current` document. Returns parsed object or `null` if not found.
- **`saveProjectToFirestore(data)`** — Merges data into `projects/current` with a `_updatedAt` timestamp.
- **`deleteProjectFromFirestore()`** — Deletes `projects/current`.

**Collection structure:** `projects` → document `current` → full project JSON blob.

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

### Live URLs

| URL | Notes |
|-----|-------|
| `https://travigen.vercel.app` | Primary alias (short link) |
| `https://training-video-generator-omega.vercel.app` | Vercel-generated domain |

- **Vercel project name:** `training-video-generator`
- **Vercel team/org:** `trent-timmermans-projects`
- **GitHub repo:** `3thirty3gitter/training-video-generator`
- **Auto-deploy:** Every push to `main` triggers a new Vercel production deploy.
- **Last deployed commit:** `eb2a530` (fix: use /tmp fallback on Vercel + add /api/debug diagnostic)

### Build Notes

- `next.config.js` uses `output: 'standalone'` (Docker-compatible, harmless on Vercel) and `serverExternalPackages` to exclude large native modules from the edge bundle.
- `.npmrc` sets `legacy-peer-deps=true` to resolve the `puppeteer-screen-recorder` peer conflict.
- Build time is ~12 minutes because Puppeteer downloads Chromium (~150 MB) during `npm install`. This is a known slow step; no fix applied.

### Vercel Limitations

**Puppeteer/FFmpeg/screen recording will NOT work** in Vercel's serverless environment:
- Serverless functions have a 50 MB deployment limit — Chromium alone is ~280 MB.
- No persistent filesystem — browser sessions and video recordings require disk.
- Default 10-second timeout (30s max on free tier) — too short for browser automation.
- No headed/visible browser mode.

**What WORKS on Vercel:**

| Feature | Works? |
|---------|--------|
| Main UI (`page.tsx`, components) | ✅ |
| `/view` tutorial viewer | ✅ |
| `/api/project/load` + `/api/project/save` (Firestore) | ✅ |
| `/api/generate-narration` (Gemini API call) | ✅ |
| `/api/export` (DOCX from existing data) | ✅ |
| `/api/export/web` (HTML template generation) | ✅ |
| `/api/debug` (Firestore diagnostic) | ✅ |
| `/api/wizard/*` (needs persistent Puppeteer) | ❌ |
| `/api/capture` (needs Puppeteer) | ❌ |
| `/api/analyze-page` (needs Puppeteer) | ❌ |
| `/api/export/video` (needs FFmpeg + filesystem) | ❌ |
| `/api/voice-preview` (needs FFmpeg) | ❌ |

### Recommended Full-Stack Deployment

For the complete feature set (Puppeteer + FFmpeg), deploy to a platform that supports persistent containers:

- **Railway** or **Render** — use the included `Dockerfile`, set build: `docker build`, start: auto via `CMD`
- **VPS / DigitalOcean / Hetzner** — clone repo, `docker build -t training-video-gen . && docker run -p 3000:3000 training-video-gen`

The `Dockerfile` at the repo root installs Chromium, FFmpeg, and Python 3 on `node:20-slim`.

---

## Firestore Persistence

### Overview

Project state is persisted to **Google Cloud Firestore** when the Firebase environment variables are configured. On Vercel, the filesystem is read-only (`/var/task` is immutable), so Firestore is the only durable storage option.

### Storage Fallback Chain

```
1. Firestore (if FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY are set and init succeeds)
   ↓ on error
2. /tmp/project_data.json (on Vercel — os.tmpdir() == /tmp)
   ↓ (or when running locally)
3. project_data.json in project root (process.cwd())
```

### Firebase Project Details

| Setting | Value |
|---------|-------|
| Firebase project ID | `training-video-gen` |
| Firestore region | `nam5` (us-central, default) |
| Database mode | Native |
| Collection | `projects` |
| Document | `current` |
| Service account email | `firebase-adminsdk-fbsvc@training-video-gen.iam.gserviceaccount.com` |

### Firestore Security Rules

The current rules (Firebase Console → Firestore → Rules) should be:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false; // Server-side only via Admin SDK
    }
  }
}
```

The Admin SDK bypasses these rules — they only apply to client-side SDKs. Set them to `false` for all client access (we only use server-side Admin SDK).

### Environment Variables for Firestore

All four must be set in Vercel Dashboard → Project → Settings → Environment Variables:

```
FIREBASE_PROJECT_ID=training-video-gen
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@training-video-gen.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

**Private key format:** Vercel stores multiline values with literal `\n`. `firestore.ts` handles both literal `\n` and real newlines.

### Diagnosing Firestore Issues

1. Deploy the latest code to Vercel.
2. Visit `https://travigen.vercel.app/api/debug` in your browser.
3. The response JSON shows:
   - `FIREBASE_PROJECT_ID` — whether the env var is set
   - `FIREBASE_CLIENT_EMAIL` — whether the env var is set
   - `FIREBASE_PRIVATE_KEY` — character count and first 27 chars (safe preview)
   - `privateKeyHasLiteralNewlines` — `true` means key has `\n` as text (Vercel stores them this way, handled automatically)
   - `privateKeyHasRealNewlines` — `true` means key has actual line breaks
   - `adminAppsCount` — number of initialized Firebase admin apps (should be 1)
   - `firestoreResult` — either `"OK — read/write succeeded"` or a full error string

4. If `firestoreResult` says `ERROR`, the full error message tells you whether it's a credential problem, network issue, or missing database.

### If Firestore Is Not Working

- Verify all 4 env vars are set in Vercel (not just in `.env.local`).
- Confirm the Firestore database exists: Firebase Console → Firestore → see the data tab.
- Confirm the database is in **Native mode** (not Datastore mode).
- The service account key may have been rotated. Get a fresh key from Firebase Console → Project Settings → Service Accounts → Generate new private key, and re-run the setup.

### Re-running the Vercel Setup Script

If env vars need to be re-pushed:

```bash
# In the Codespace, with .env.local correct:
bash set-vercel-env.sh
npx vercel --prod
```

`set-vercel-env.sh` is gitignored. If it's gone, manually set each variable in Vercel Dashboard.

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | Yes (for AI features) | Google Gemini API key. Get free at https://aistudio.google.com/app/apikey |
| `FIREBASE_PROJECT_ID` | Yes (for cloud persistence) | Firebase project ID — `training-video-gen` |
| `FIREBASE_CLIENT_EMAIL` | Yes (for cloud persistence) | Service account email from Firebase |
| `FIREBASE_PRIVATE_KEY` | Yes (for cloud persistence) | Full PEM private key from Firebase service account JSON |

The app runs without Firebase env vars but project state will only persist to `/tmp` (ephemeral on Vercel — lost on redeploy) or local disk.

---

## Current Project State

### Deployment Status

| Item | Status |
|------|--------|
| Vercel deployment | ✅ Live at `travigen.vercel.app` |
| GitHub auto-deploy | ✅ Active on `main` branch |
| Firestore database | ✅ Created (Native mode, `training-video-gen`) |
| Firestore env vars on Vercel | ✅ All 4 set |
| Firestore connection verified | ⏳ Visit `/api/debug` to confirm |
| Gemini API key | ⏳ User to confirm it was added to Vercel |
| EROFS crash | ✅ Fixed (using `/tmp` fallback) |
| Favicon 404 | ✅ Fixed (`public/favicon.ico` added) |

### Active Project: PrintPilot User Guide

- **Target URL:** https://www.printpilot.ca
- **Voice:** au-natasha (Australian female)
- **Settings:** Captions enabled, fade transitions, cinematic music at 40% volume
- **Steps:** 12 video steps captured via interactive wizard

| Step | Title | Has Video | Has Narration |
|------|-------|-----------|---------------|
| 1 | Welcome to PrintPilot | Yes | Yes (full AI narration) |
| 2-12 | Video Action | Yes | Generic fallback only |

Steps 2-12 have video recordings but their titles and narration are generic defaults ("Video Action" / "Video action recorded successfully.") — Gemini video analysis either wasn't applied or failed silently for these steps.

### Git Commit History (This Session)

| Commit | Message |
|--------|---------|
| `eb2a530` | fix: use /tmp fallback on Vercel + add /api/debug diagnostic |
| `2efabe6` | fix: Firestore error handling + favicon 404 |
| `acecc84` | chore: gitignore Firebase service account keys and env push script |
| `00ea6e4` | feat: add Firestore persistence for cloud deployments |
| `c2b4c30` | fix: TypeScript build error + add Docker production config |
| `d1a11a6` | Rewrite HANDOFF.md with comprehensive project documentation |

---

## Known Issues

### Production (Vercel)

1. **Firestore connection unverified** — `/api/debug` was added in commit `eb2a530`. Visit `https://travigen.vercel.app/api/debug` after the latest deploy completes to confirm `firestoreResult: "OK"`. Until verified, project saves fall back to `/tmp` which is ephemeral (wiped on redeploy).

2. **`/tmp` storage is ephemeral** — Even with the EROFS fix, data written to `/tmp` on Vercel is lost on each new deploy/cold start. This is the Firestore fallback only. Proper persistence requires Firestore to be working.

3. **Slow Vercel builds (~12 min)** — Puppeteer downloads Chromium on every build. To speed up, add `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` as a Vercel env var (safe since Puppeteer won't work on Vercel anyway). The Chromium binary is only needed for Docker/local runs.

4. **Wizard/capture/video features broken on Vercel** — All Puppeteer-dependent routes (`/api/wizard/*`, `/api/capture`, `/api/analyze-page`, `/api/export/video`, `/api/voice-preview`) will fail with errors on Vercel serverless. Use locally or via Docker for these features.

### Codebase

5. **Duplicate `TutorialStep` interface** — Defined twice in `page.tsx` (top and bottom). The bottom export includes an extra `context?: string` field. Can cause type confusion.

6. **`setIncludeCaptions` called twice** on load in `page.tsx` (lines 59-60). Harmless but redundant.

7. **Unused state variables** — `isInteractive` and `loginWaitTime` are declared in `page.tsx` but never rendered in the UI.

8. **Google TTS text truncation** — `tts-engine.ts` silently truncates narration text to 199 characters (`safeText = text.substring(0, 199)`). Long narrations will be cut off.

9. **No macOS FFmpeg support** — Hardcoded paths only handle `win32-x64` and `linux-x64`.

10. **No authentication** — All API routes are open. Designed for local/single-user use only.

11. **Puppeteer version deprecated** — v21.11.0 is deprecated. Upgrade to 24.15+ recommended.

12. **`puppeteer-screen-recorder` peer conflict** — Wants puppeteer@19, we have 21. Resolved via `.npmrc` legacy-peer-deps but may cause runtime issues.

13. **Unused npm packages** — `sharp`, `@xenova/transformers`, `wavefile`, `kokoro-js`, `html-to-docx` are installed but never imported. Adds ~100MB+ to `node_modules`.

14. **`exportToVideo` button handler** — In `page.tsx`, the "Export Guide" header button just calls `alert()` — it's not wired to the actual render pipeline (the sidebar Video button is).

---

## Future Enhancements

### High Priority

- **Verify Firestore is working** — Visit `/api/debug` on the live deploy, confirm `"OK"` result
- **Add `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` to Vercel env vars** — Speeds up builds by ~8 minutes
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
- **Serverless-compatible capture** — Puppeteer Core + Chrome AWS Lambda for Vercel

---

**Last Updated:** March 21, 2026  
**Version:** 1.2.0  
**Repository:** https://github.com/3thirty3gitter/training-video-generator
