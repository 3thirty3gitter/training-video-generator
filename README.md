# SaaS Training Video Generator

Automate the creation of training videos for your SaaS products using Google NotebookLM.

## Features

- 📸 **Automated Screenshot Capture** - Browser automation to capture app screenshots
- 🤖 **AI-Powered Narration** - Generate professional narration using Google Gemini AI
- 📄 **NotebookLM-Ready Export** - Creates structured documents for video generation
- 🔄 **Reusable Templates** - Save tutorial templates for updates
- 🎨 **Customizable Branding** - Add your logo and branding to screenshots

## How It Works

1. **Define Tutorial Steps** - Create a script of what to demonstrate
2. **Automated Capture** - Tool navigates your app and captures screenshots
3. **Generate Narration** - AI assists in creating professional narration
4. **Export Document** - Creates Google Doc/PDF ready for NotebookLM
5. **Generate Video** - Upload to NotebookLM for automatic video creation

## Quick Start

```bash
# Install dependencies
npm install

# Set up Gemini API (optional but recommended)
# 1. Get your API key from https://aistudio.google.com/app/apikey
# 2. Copy .env.example to .env.local
# 3. Add your API key to .env.local

# Start development server
npm run dev
```

Open http://localhost:3000 to start creating training videos.

**Note:** The app works without a Gemini API key (uses templates), but AI-generated narration requires a free Gemini API key. See [GEMINI_SETUP.md](./GEMINI_SETUP.md) for details.

## Use Cases

- Product onboarding videos
- Feature tutorials
- Update announcements
- Documentation videos
- Sales demos
