# PrintPilot Training Video Guide

## Quick Start Guide for Creating PrintPilot.ca Training Videos

### Step 1: Launch the Tool
```bash
npm run dev
```
Open http://localhost:3000

### Step 2: Project Setup
- **Project Name**: "PrintPilot User Guide" (or specific feature name)
- **App URL**: https://www.printpilot.ca/

### Step 3: Define Your Tutorial Steps

#### Example: "Getting Started with PrintPilot"

**Step 1: Homepage Overview**
- Title: "Welcome to PrintPilot"
- Action: (leave empty for homepage)
- Narration: "Welcome to PrintPilot, your all-in-one print management solution. This platform helps you streamline your printing business with powerful tools for quotes, orders, and customer management."

**Step 2: Navigate to Features**
- Title: "Explore Key Features"
- Action: `navigate to /features` (or appropriate URL)
- Narration: "Let's explore the key features that make PrintPilot the perfect solution for print shops. From automated quoting to order tracking, every feature is designed to save you time."

**Step 3: Login/Signup**
- Title: "Create Your Account"
- Action: `click button.signup` (use actual selector)
- Narration: "Getting started is easy. Simply click the sign-up button to create your free account and begin transforming your print business."

**Step 4: Dashboard**
- Title: "Your Dashboard"
- Action: `navigate to /dashboard`
- Narration: "Once logged in, you'll see your personalized dashboard. Here you can view active orders, pending quotes, and get a quick overview of your business metrics."

**Step 5: Create Quote**
- Title: "Creating a Quote"
- Action: `click #new-quote` (use actual selector)
- Narration: "Creating quotes with PrintPilot is incredibly fast. Click the new quote button to start building a professional quote for your customer in minutes, not hours."

### Step 4: Automation Tips

#### Common Action Patterns:
```
# Navigation
navigate to /dashboard
navigate to https://www.printpilot.ca/pricing

# Clicking elements
click button[data-testid="signup"]
click .cta-button
click #menu-toggle

# Scrolling to sections
scroll to #features-section
scroll to footer

# Typing (for demo purposes)
type #search-input Search Text Here
```

### Step 5: Capture & Generate
1. Fill out all steps with titles and actions
2. Click "Capture All Screenshots" - tool will automatically navigate and capture
3. Review screenshots and edit narration as needed
4. Use "AI Generate" on individual steps to auto-write narration
5. Click "Export for NotebookLM" to download the .docx file

### Step 6: Upload to NotebookLM
1. Go to https://notebooklm.google.com
2. Create a new notebook
3. Upload the exported .docx file
4. Click "Video Overview" in the Studio panel
5. Wait for NotebookLM to generate your training video!

## Best Practices

### Writing Great Narration
- ✅ Be conversational and friendly
- ✅ Explain the "why" not just the "what"
- ✅ Keep it concise (30-60 seconds per step)
- ✅ Highlight benefits and value
- ❌ Avoid technical jargon
- ❌ Don't just describe what's visible

### Choosing Steps
- Start with the big picture (what is PrintPilot?)
- Show the most important features first
- End with a call-to-action (try it free, contact sales)
- Keep tutorials focused (5-10 steps is ideal)

### Screenshot Quality
- Use wait times (1-2 seconds) to ensure pages fully load
- Test navigation paths before capturing
- Ensure you're logged in if showing dashboard features

## Example Video Ideas for PrintPilot

1. **"Quick Start Guide"** - 5 steps showing signup to first quote
2. **"Quote Builder Deep Dive"** - Detailed walkthrough of quote features
3. **"Managing Orders"** - From order placement to completion
4. **"Customer Portal"** - How customers interact with PrintPilot
5. **"Pricing & Plans"** - Overview of subscription options
6. **"Integration Features"** - Connect with other tools
7. **"Mobile Experience"** - Using PrintPilot on the go

## Troubleshooting

**Screenshots not capturing?**
- Check that the URL is correct and publicly accessible
- Ensure selectors in "Action" field are valid
- Increase wait time for slow-loading pages

**Narration sounds robotic?**
- Edit the AI-generated text to add personality
- Read it out loud to test flow
- Add questions or excitement where appropriate

**Export failing?**
- Ensure at least one step has content
- Check that screenshots are properly captured
- Try exporting with fewer steps first to test

---

**Ready to create awesome training videos for PrintPilot? Let's go! 🚀**
