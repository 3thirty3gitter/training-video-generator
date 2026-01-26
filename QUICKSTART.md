# 🚀 Quick Start: Using AI Narration Generation

## Step-by-Step Guide

### 1️⃣ Get Your Gemini API Key (Free!)

1. Visit **[Google AI Studio](https://aistudio.google.com/app/apikey)**
2. Sign in with your Google account
3. Click **"Create API Key"** or **"Get API Key"**
4. Copy the API key (starts with `AIza...`)

### 2️⃣ Add API Key to Your Project

1. Open the `.env.local` file in the project root
2. Replace the placeholder with your actual key:

```env
GEMINI_API_KEY=AIzaSy...your_actual_key_here
```

3. Save the file
4. The dev server will automatically reload!

### 3️⃣ Use AI Narration

1. **Create a Project**
   - Enter a project name (e.g., "MyApp Tutorial")
   - Enter your app URL (e.g., "https://myapp.com")

2. **Add a Step**
   - Click the **+** button to add a new step
   - Fill in the **Step Title** (e.g., "Login to Dashboard")
   - Fill in the **Action** (e.g., "navigate to /login")

3. **Generate AI Narration**
   - Click the **"AI Generate"** button (magic wand icon ✨)
   - Wait 2-3 seconds
   - Gemini will generate professional narration!

4. **Customize** (Optional)
   - Edit the generated narration to match your style
   - Adjust the wait time if needed

5. **Capture Screenshots**
   - Click **"Capture All Screenshots"** to automate screenshot capture
   - The tool will navigate your app and capture images

6. **Export**
   - Click **"Export for NotebookLM"** to download the Word document
   - Upload to NotebookLM to generate your video!

## 💡 Pro Tips

- **Better Prompts = Better Narration**: Use descriptive step titles and clear actions
- **Context Matters**: The project name helps Gemini understand the context
- **Edit as Needed**: AI-generated narration is a starting point - customize it!
- **Test First**: Try generating narration for one step before doing all of them

## 🎯 Example Workflow

```
Project Name: "PrintPilot User Guide"
App URL: "https://printpilot.ca"

Step 1:
  Title: "Welcome to PrintPilot Dashboard"
  Action: "navigate to /dashboard"
  [Click AI Generate] →
  Narration: "Welcome to your PrintPilot dashboard! This is your central hub 
  where you can manage all your print orders, track shipments, and access 
  important analytics at a glance."

Step 2:
  Title: "Create a New Quote"
  Action: "click button[data-testid='create-quote']"
  [Click AI Generate] →
  Narration: "Let's create a new quote for your customer. Simply click the 
  'Create Quote' button in the top right corner. This will open up our 
  intuitive quote builder where you can specify all the details."
```

## ❓ Troubleshooting

### "Using template-based narration" warning
- Your API key isn't configured properly
- Check the `.env.local` file exists and has the correct key
- Restart the dev server

### "Failed to generate narration"
- Check your internet connection
- Verify your API key is valid
- Check if you've hit the rate limit (60 requests/minute on free tier)

### Narration doesn't match expectations
- Provide more context in the step title and action
- Edit the generated narration manually
- Try regenerating with different wording

## 🎉 You're Ready!

Start creating amazing training videos with AI-powered narration! 🚀
