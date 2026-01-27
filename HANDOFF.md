# Training Video Generator - Handoff Documentation

**Project Name:** SaaS Training Video Generator for NotebookLM  
**Repository:** https://github.com/3thirty3gitter/training-video-generator  
**Created:** January 2026  
**Status:** Production Ready ✅

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Business Context](#business-context)
3. [Technical Architecture](#technical-architecture)
4. [Getting Started](#getting-started)
5. [How It Works](#how-it-works)
6. [API Documentation](#api-documentation)
7. [File Structure](#file-structure)
8. [Dependencies](#dependencies)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)
11. [Future Enhancements](#future-enhancements)
12. [Support & Maintenance](#support--maintenance)

---

## 🎯 Project Overview

### What Is This?

This tool **automates the creation of training videos** for SaaS products using Google NotebookLM's Video Overview feature. Instead of manually:
- Taking screenshots
- Writing narration scripts
- Formatting documents
- Creating videos

You can now:
1. Define tutorial steps
2. Click a button to auto-capture screenshots
3. Generate AI-assisted narration
4. Export a NotebookLM-ready document
5. Let NotebookLM create a professional narrated video

### Primary Use Case

**PrintPilot.ca** - Creating onboarding, feature tutorials, and marketing videos for this print management SaaS platform. The tool is designed to be reusable for any SaaS product.

### Key Features

- ✅ **Browser Automation** - Uses Puppeteer to navigate your app and capture screenshots
- ✅ **Smart Actions** - Define clicks, navigation, scrolling via simple syntax
- ✅ **AI Narration** - Professional narration generation powered by Google Gemini AI
- ✅ **Document Export** - Creates Word documents with embedded images
- ✅ **Live Preview** - See how your tutorial will look before exporting
- ✅ **Reusable** - Save time on every SaaS product you build

---

## 💼 Business Context

### Problem Solved

Creating training videos for SaaS products is:
- **Time-consuming** - Hours of work per video
- **Repetitive** - Same process for every feature/update
- **Costly** - Professional video tools are expensive
- **Error-prone** - Manual screenshot capture misses steps

### Solution Provided

This tool reduces video creation from **hours to minutes** by:
1. Automating screenshot capture
2. Standardizing narration format
3. Leveraging free Google NotebookLM for video generation
4. Creating reusable templates

### ROI

- **Time Saved:** ~4-6 hours per training video
- **Cost Saved:** $0 (vs $20-50/month for video tools)
- **Quality:** Professional, consistent videos every time
- **Scalability:** Create unlimited videos for all your SaaS products

---

## 🏗️ Technical Architecture

### Tech Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Frontend** | Next.js | 14.2.x | React framework with server actions |
| **UI** | Tailwind CSS | 3.4.x | Styling and responsive design |
| **Automation** | Puppeteer | 21.11.x | Headless browser for screenshots |
| **Document Generation** | docx | 8.5.x | Create Word documents |
| **Icons** | Lucide React | 0.344.x | UI icons |
| **Runtime** | Node.js | 20+ | JavaScript runtime |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface (Next.js)                 │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │ Project      │ Step         │ Document                 │ │
│  │ Setup        │ Management   │ Preview                  │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                      │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │ /api/capture │ /api/        │ /api/export              │ │
│  │              │ generate-    │                          │ │
│  │ Puppeteer    │ narration    │ docx Builder             │ │
│  │ automation   │              │                          │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  ┌──────────────┬──────────────────────────────────────┐   │
│  │ Target SaaS  │ Google NotebookLM                    │   │
│  │ (PrintPilot) │ (Video Generation - Manual Upload)   │   │
│  └──────────────┴──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Input** → Project name, app URL, tutorial steps
2. **Browser Automation** → Puppeteer navigates target SaaS, captures screenshots
3. **Image Processing** → Screenshots encoded as base64, embedded in step data
4. **Narration** → Template-based or AI-generated text
5. **Document Build** → Word doc created with images + narration
6. **Export** → User downloads .docx file
7. **NotebookLM** → User uploads to NotebookLM (external, manual step)
8. **Video Generation** → NotebookLM creates narrated video

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 20.x or higher
- **npm**: 10.x or higher
- **Git**: For version control
- **Chrome/Chromium**: Puppeteer downloads its own, but local Chrome helps debugging

### Installation

```bash
# Clone the repository
git clone https://github.com/3thirty3gitter/training-video-generator.git
cd training-video-generator

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at **http://localhost:3000**

### Environment Variables

Currently, no environment variables are required. Future enhancements may need:

# Gemini API Key (Required for AI features)
GEMINI_API_KEY=your_gemini_api_key


---

## 🔧 How It Works

### User Workflow

#### Step 1: Project Setup
- Enter **Project Name** (e.g., "PrintPilot User Guide")
- Enter **App URL** (e.g., "https://www.printpilot.ca/")

#### Step 2: Define Steps
Click the **"+"** button to add tutorial steps. For each step:

**Example Step:**
```
Title: "Welcome to PrintPilot Dashboard"
Action: navigate to /dashboard
Wait Time: 2000ms
Narration: "Welcome to your PrintPilot dashboard, where you can manage all your print orders..."
```

#### Step 3: Action Syntax

The `Action` field supports these commands:

```bash
# Navigate to a page
navigate to /dashboard
navigate to https://www.printpilot.ca/pricing

# Click an element (CSS selector)
click button.signup-btn
click #login-button
click [data-testid="create-quote"]

# Type into an input (CSS selector + text)
type #search-input my search query

# Scroll to an element
scroll to #features-section
scroll to footer
```

#### Step 4: Automate Capture
Click **"Capture All Screenshots"** and the tool will:
1. Open Puppeteer headless browser
2. Navigate to your app URL
3. For each step:
   - Execute the action
   - Wait the specified time
   - Capture screenshot
   - Store as base64
4. Update your steps with screenshots

#### Step 5: Generate Narration
- Click **"AI Generate"** on any step to auto-generate narration based on the title and action
- Or write custom narration manually

#### Step 6: Export
Click **"Export for NotebookLM"** to download a `.docx` file with:
- Title page
- Each step as a section with screenshot and narration
- Conclusion

#### Step 7: NotebookLM (Manual)
1. Go to https://notebooklm.google.com
2. Create a new notebook
3. Upload the exported `.docx` file
4. Click "Video Overview" in the Studio panel
5. Wait for video generation (usually 5-10 minutes)
6. Download and share your video!

---

## 📡 API Documentation

### POST /api/capture

**Purpose:** Automate browser navigation and screenshot capture

**Request Body:**
```typescript
{
  url: string,              // Target app URL
  steps: TutorialStep[]     // Array of step objects
}
```

**Response:**
```typescript
{
  success: boolean,
  steps: TutorialStep[],    // Updated with screenshots
  message: string
}
```

**Implementation Details:**
- Uses Puppeteer in headless mode
- Viewport: 1920x1080
- Timeout: 30 seconds for navigation
- Screenshot format: PNG, base64-encoded
- Handles errors gracefully (returns steps without screenshots if action fails)

**Supported Actions:**
- `navigate to [url]` - Navigate to URL
- `click [selector]` - Click element
- `type [selector] [text]` - Type into input
- `scroll to [selector]` - Scroll element into view

---

### POST /api/generate-narration

**Purpose:** Generate narration text for a tutorial step

**Request Body:**
```typescript
{
  title: string,      // Step title
  action: string,     // Action description
  context: string     // Project name for context
}
```

**Response:**
```typescript
{
  success: boolean,
  narration: string
}
```

**Current Implementation:**
- Uses Google Gemini 2.0 Flash (Multimodal)
- Analyzes screenshots to write descriptive narration
- Falls back to templates if no API key is provided


---

### POST /api/export

**Purpose:** Generate Word document for NotebookLM

**Request Body:**
```typescript
{
  projectName: string,
  steps: TutorialStep[]
}
```

**Response:**
- Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Binary Word document file

**Document Structure:**
1. Heading 1: Project name
2. Introduction paragraph
3. For each step:
   - Heading 2: "Step N: [title]"
   - Screenshot image (600x400px)
   - Narration paragraph
   - Horizontal separator
4. Conclusion paragraph

**Image Handling:**
- Screenshots decoded from base64
- Embedded directly in document
- Sized for readability (600x400)
- Centered alignment

---

## 📁 File Structure

```
training-video-generator/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── capture/route.ts          # Screenshot automation
│   │   │   ├── generate-narration/route.ts # Narration generation
│   │   │   └── export/route.ts           # Document export
│   │   ├── globals.css                    # Global styles
│   │   ├── layout.tsx                     # Root layout
│   │   └── page.tsx                       # Main app page
│   └── components/
│       ├── StepEditor.tsx                 # Step editing UI
│       └── PreviewPanel.tsx               # Document preview
├── public/                                 # Static assets (none yet)
├── .gitignore                             # Git ignore rules
├── next.config.js                         # Next.js configuration
├── package.json                           # Dependencies
├── postcss.config.js                      # PostCSS config
├── tailwind.config.js                     # Tailwind config
├── tsconfig.json                          # TypeScript config
├── README.md                              # Project README
├── PRINTPILOT_GUIDE.md                    # Use case guide
└── HANDOFF.md                             # This document
```

### Key Files Explained

**`src/app/page.tsx`**
- Main application logic
- State management for steps, current step, loading states
- Handlers for add/update/delete steps
- API calls to capture, generate, export

**`src/components/StepEditor.tsx`**
- Form for editing individual steps
- Title, action, wait time, narration inputs
- AI generate button
- Screenshot preview

**`src/components/PreviewPanel.tsx`**
- Document preview
- Shows how steps will appear in exported doc
- Highlights current step

**`src/app/api/capture/route.ts`**
- Puppeteer automation
- Browser launch with headless mode
- Action parsing and execution
- Screenshot capture and encoding

**`src/app/api/export/route.ts`**
- docx library integration
- Document structure creation
- Image embedding from base64
- Binary file response

---

## 📦 Dependencies

### Production Dependencies

```json
{
  "next": "^14.1.0",              // React framework
  "react": "^18.2.0",             // UI library
  "react-dom": "^18.2.0",         // React DOM renderer
  "puppeteer": "^21.11.0",        // Browser automation
  "docx": "^8.5.0",               // Word doc generation
  "html-to-docx": "^1.8.0",       // HTML to Word converter (unused, can remove)
  "lucide-react": "^0.344.0"      // Icon library
}
```

### Dev Dependencies

```json
{
  "@types/node": "^20.11.17",     // Node.js types
  "@types/react": "^18.2.55",     // React types
  "@types/react-dom": "^18.2.19", // React DOM types
  "typescript": "^5.3.3",         // TypeScript compiler
  "autoprefixer": "^10.4.17",     // PostCSS plugin
  "postcss": "^8.4.35",           // CSS processor
  "tailwindcss": "^3.4.1"         // CSS framework
}
```

### Upgrading Dependencies

**Puppeteer Note:** Currently using v21.11.0 (deprecated). To upgrade:

```bash
npm install puppeteer@latest
```

Puppeteer 24.15.0+ is recommended. No breaking changes expected.

### Removing Unused Dependencies

`html-to-docx` can be safely removed:

```bash
npm uninstall html-to-docx
```

---

## 🚢 Deployment

### Deployment Options

#### Option 1: Vercel (Recommended)

**Pros:**
- Free tier available
- Automatic deployments from GitHub
- Zero config for Next.js

**Cons:**
- Puppeteer may have issues (serverless function limits)
- May need to switch to Puppeteer Core + Chrome AWS Lambda

**Steps:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or connect GitHub repo in Vercel dashboard
```

**Puppeteer Fix for Vercel:**
```bash
npm install puppeteer-core chrome-aws-lambda
```

Update `src/app/api/capture/route.ts`:
```typescript
import chromium from 'chrome-aws-lambda';

const browser = await puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath,
  headless: chromium.headless,
});
```

---

#### Option 2: Railway / Render

**Pros:**
- Better support for Puppeteer
- Free tier available
- Supports long-running processes

**Steps:**
1. Push to GitHub
2. Connect repo in Railway/Render
3. Set build command: `npm run build`
4. Set start command: `npm start`

---

#### Option 3: Self-Hosted (VPS)

**Pros:**
- Full control
- No serverless limitations
- Can run Puppeteer with full Chrome

**Steps:**
```bash
# On server (Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Chrome dependencies
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libxkbcommon0 libxcomposite1 \
  libxrandr2 libgbm1 libpango-1.0-0 libcairo2

# Clone and run
git clone https://github.com/3thirty3gitter/training-video-generator.git
cd training-video-generator
npm install
npm run build
npm start
```

Use PM2 for process management:
```bash
npm install -g pm2
pm2 start npm --name "training-video-gen" -- start
pm2 save
pm2 startup
```

---

#### Option 4: Docker

**Dockerfile:**
```dockerfile
FROM node:20-alpine

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t training-video-gen .
docker run -p 3000:3000 training-video-gen
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Screenshots Not Capturing

**Symptoms:**
- "Capture All Screenshots" completes but no images
- Steps don't update with screenshot data

**Causes:**
- Invalid selectors in action field
- Target elements not loading in time
- Puppeteer Chrome download failed

**Solutions:**
```bash
# Reinstall Puppeteer to download Chrome
npm uninstall puppeteer
npm install puppeteer

# Increase wait times in steps (2000ms → 5000ms)

# Test selector in browser console first:
document.querySelector('your-selector')

# Check Puppeteer logs in terminal
```

---

#### 2. Export Failing

**Symptoms:**
- Export button doesn't download file
- Error in console

**Causes:**
- Screenshots too large (>10MB total)
- Invalid base64 data
- Browser blocking download

**Solutions:**
```javascript
// Reduce screenshot quality in route.ts:
const screenshot = await page.screenshot({ 
  encoding: 'base64',
  quality: 70,  // Add this for JPEG
  type: 'jpeg'  // Change from PNG
})

// Check browser download permissions

// Clear steps and try with fewer items
```

---

#### 3. Puppeteer Timeout

**Symptoms:**
- "Navigation timeout of 30000ms exceeded"

**Causes:**
- Slow website loading
- Invalid URL
- Network issues

**Solutions:**
```typescript
// Increase timeout in route.ts:
await page.goto(url, { 
  waitUntil: 'networkidle2', 
  timeout: 60000  // 60 seconds
})

// Or change waitUntil strategy:
await page.goto(url, { 
  waitUntil: 'domcontentloaded'  // Faster
})
```

---

#### 4. Build Errors

**Symptoms:**
- `npm run build` fails
- TypeScript errors

**Solutions:**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check TypeScript config
npx tsc --noEmit
```

---

#### 5. Port Already in Use

**Symptoms:**
- "Port 3000 is already in use"

**Solutions:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
npm run dev -- -p 3001
```

---

## 🔮 Future Enhancements

### Priority 1 (High Value, Low Effort)

#### 1. Template Library
Save and reuse tutorial templates:

**Database Schema:**
```typescript
interface Template {
  id: string;
  name: string;
  targetUrl: string;
  steps: TutorialStep[];
  createdAt: Date;
}
```

**UI Addition:**
- "Save as Template" button
- "Load Template" dropdown
- Template management page

**Storage:** Use localStorage or add Supabase/Firebase

---

#### 3. Video Preview
Show mock video before exporting:

**Implementation:**
- Create a preview mode that plays through steps
- Auto-play narration with Web Speech API
- Slideshow-style presentation

```typescript
const speak = (text: string) => {
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
};
```

---

### Priority 2 (Medium Value, Medium Effort)

#### 4. Batch Processing
Process multiple tutorials at once:

- Upload CSV with step definitions
- Bulk capture screenshots
- Generate multiple documents

---

#### 5. Authentication & Multi-User
Add user accounts to save tutorials:

**Tech Stack:**
- NextAuth.js
- Prisma + PostgreSQL
- User dashboard

**Features:**
- Save tutorials to account
- Share with team members
- Usage analytics

---

#### 6. Direct NotebookLM Integration
Auto-upload to NotebookLM (if API becomes available):

Currently, Google NotebookLM has no public API. Monitor:
- https://notebooklm.google.com/docs
- Google AI Studio API

When available, add:
```typescript
// Auto-upload to NotebookLM
const notebook = await notebookLM.create({ title: projectName });
await notebook.upload(docxBuffer);
const video = await notebook.generateVideo();
```

---

#### 7. Video Customization
Add branding before NotebookLM upload:

- Logo overlay on screenshots
- Custom color scheme
- Brand fonts
- Intro/outro slides

**Tools:**
- Sharp for image processing
- Canvas API for overlays

---

### Priority 3 (High Value, High Effort)

#### 8. Interactive Tutorials
Where the user clicks, the tutorial captures:

**Chrome Extension Approach:**
1. Install recording extension
2. Navigate app while extension records
3. Export actions to this tool
4. Auto-generate steps

**Similar to:** Scribe, Loom

---

#### 9. AI Screenshot Analysis
Auto-generate narration from screenshots:

**Flow:**
1. Capture screenshot
2. Send to OpenAI Vision API
3. Describe what's visible
4. Generate contextual narration

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4-vision-preview",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "Describe this UI for a training video" },
      { type: "image_url", image_url: screenshotBase64 }
    ]
  }]
});
```

---

#### 10. Multi-Language Support
Generate videos in multiple languages:

- Translate narration (DeepL API)
- NotebookLM supports 80+ languages
- Batch export translations

---

## 🆘 Support & Maintenance

### Regular Maintenance Tasks

**Weekly:**
- Monitor npm audit for security vulnerabilities
- Review error logs if deployed

**Monthly:**
- Update dependencies: `npm update`
- Check for Next.js updates
- Review Puppeteer compatibility

**Quarterly:**
- Update Node.js version
- Review cloud costs if deployed
- Optimize performance

### Dependency Updates

```bash
# Check outdated packages
npm outdated

# Update all to latest minor/patch
npm update

# Update to latest major (may break)
npx npm-check-updates -u
npm install
```

### Security

**Run audits:**
```bash
npm audit
npm audit fix
```

**Known Issues:**
- Puppeteer has known vulnerabilities in older versions
- Update to latest: `npm install puppeteer@latest`

### Monitoring

**If deployed, monitor:**
- Uptime (UptimeRobot)
- Error rates (Sentry)
- Performance (Vercel Analytics)
- API usage (custom logging)

---

## 📞 Contact & Resources

### Repository
- **GitHub:** https://github.com/3thirty3gitter/training-video-generator
- **Issues:** https://github.com/3thirty3gitter/training-video-generator/issues

### Documentation
- **Next.js Docs:** https://nextjs.org/docs
- **Puppeteer Docs:** https://pptr.dev/
- **docx Library:** https://docx.js.org/
- **NotebookLM:** https://notebooklm.google.com/

### Key External Tools
- **Google NotebookLM:** https://notebooklm.google.com/ (for video generation)
- **PrintPilot:** https://www.printpilot.ca/ (primary use case)

### Development Tips

1. **Test selectors first:** Always test CSS selectors in browser DevTools before adding to actions
2. **Use wait times generously:** Better to wait 3 seconds than miss a screenshot
3. **Preview in NotebookLM:** Upload test docs to see how NotebookLM interprets formatting
4. **Save templates:** Once you create a good tutorial flow, save the JSON to reuse

---

## 🎬 Production Use (PrintPilot)

### Recommended Video Ideas

1. **"Getting Started"** - 7 steps from homepage to first quote
2. **"Dashboard Overview"** - Key metrics and navigation
3. **"Creating Quotes"** - Detailed quote builder tutorial
4. **"Managing Orders"** - Order workflow from start to finish
5. **"Customer Portal"** - What customers see and do
6. **"Product Updates"** - New feature announcements (recurring)

### Best Practices for PrintPilot

- **Login First:** Manually log in before running automation (or add login step)
- **Use Test Data:** Create test orders/quotes for clean screenshots
- **Consistent Branding:** Always use same color scheme in interface
- **Clear Navigation:** Show breadcrumbs or menu items in every screenshot
- **Call-to-Action:** End every video with next steps (sign up, contact sales, etc.)

### Narration Style Guide

- ✅ **Friendly & Professional:** "Let's explore..." not "Click here..."
- ✅ **Benefit-Focused:** Explain WHY not just WHAT
- ✅ **Conversational:** Read like natural speech
- ✅ **Concise:** 30-60 seconds per step max
- ❌ **Avoid Jargon:** Use plain language
- ❌ **Don't Rush:** Give time for visual absorption

---

## ✅ Handoff Checklist

Before handing off this project, ensure:

- [ ] Repository is accessible to new developer
- [ ] All dependencies install successfully (`npm install`)
- [ ] Development server runs (`npm run dev`)
- [ ] Build process works (`npm run build`)
- [ ] At least one test tutorial has been created end-to-end
- [ ] `.env` needs are documented (if any sensitive keys)
- [ ] Deployment instructions are tested
- [ ] Known issues are documented
- [ ] Contact information is provided
- [ ] Access to PrintPilot for testing (if needed)

---

## 🎯 Quick Start (TL;DR)

```bash
# Clone and setup
git clone https://github.com/3thirty3gitter/training-video-generator.git
cd training-video-generator
npm install
npm run dev

# Open http://localhost:3000

# Create tutorial
1. Project Name: "PrintPilot Tutorial"
2. App URL: "https://www.printpilot.ca/"
3. Add steps with actions
4. Capture screenshots
5. Export document
6. Upload to NotebookLM
7. Generate video ✅
```

---

**Last Updated:** January 22, 2026  
**Version:** 1.0.0  
**Status:** Production Ready  
**Next Review:** February 2026

---

*For questions or issues, create an issue on GitHub or contact the development team.*
