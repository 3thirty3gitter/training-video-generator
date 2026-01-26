# 🔧 AI Generate Button - Troubleshooting Guide

## Issue: AI Generate Button Not Active

### ✅ **FIXED!** Here's what changed:

The AI Generate button is now **more flexible** and will be active when you have:
- **Either** a Step Title filled in
- **Or** an Action filled in
- **Or** both!

### How to Use:

1. **Add a New Step**
   - Click the **+** button in the Steps panel

2. **Fill in at least ONE of these:**
   - **Step Title** (e.g., "Login to Dashboard")
   - **Action** (e.g., "navigate to /login")
   - Or both for best results!

3. **Click AI Generate**
   - The button should now be active ✨
   - Click it to generate narration

### Visual Indicators:

- **Button Disabled (grayed out)**: You need to add a title or action
- **Button Active (blue)**: Ready to generate!
- **Spinning icon**: AI is generating narration
- **Tooltip**: Hover over the button to see why it's disabled

### What You'll See:

When the button is **disabled**, you'll see a helpful hint below the narration field:
> "• Add a title or action above to enable AI generation"

### Example Workflow:

#### Option 1: Title Only
```
Step Title: "Welcome to the Dashboard"
Action: (empty)
[AI Generate] ✅ ACTIVE
```

#### Option 2: Action Only
```
Step Title: (empty)
Action: "navigate to /dashboard"
[AI Generate] ✅ ACTIVE
```

#### Option 3: Both (Recommended)
```
Step Title: "Navigate to Dashboard"
Action: "navigate to /dashboard"
[AI Generate] ✅ ACTIVE - Best results!
```

### Still Not Working?

1. **Check if you added a step**
   - Click the **+** button to add a step first
   - Select the step from the list

2. **Make sure a step is selected**
   - Click on a step in the left panel
   - The step editor should show on the right

3. **Fill in Title or Action**
   - Type something in either field
   - The button should activate immediately

4. **Check for API Key (for AI generation)**
   - Open `.env.local`
   - Make sure you have: `GEMINI_API_KEY=AIza...`
   - If no API key, it will use templates (still works!)

5. **Restart Dev Server** (if needed)
   - Press `Ctrl+C` in terminal
   - Run `npm run dev` again

### Testing the AI Generation:

1. **Add a step with a title:**
   ```
   Title: "Create a new project"
   ```

2. **Click AI Generate**

3. **With Gemini API Key:**
   - You'll get professional, contextual narration
   - Example: "Let's create a new project. This is the first step in getting started with our platform. Click the 'New Project' button to begin."

4. **Without API Key:**
   - You'll get template-based narration
   - Example: "In this step, we'll . This is an important part of using the application."

### Pro Tips:

✅ **Better titles = Better AI narration**
- Use descriptive titles like "Login to Dashboard" instead of just "Login"

✅ **Include actions for automation**
- Actions are needed for screenshot capture
- Format: `navigate to /url` or `click .selector`

✅ **Edit AI-generated narration**
- AI gives you a starting point
- Feel free to customize it!

---

## Summary

The AI Generate button is now **active when you have a title OR action** (previously required action only). This makes it much easier to generate narration early in your workflow!

**Current Status:** ✅ Fixed and deployed
**App URL:** http://localhost:3000
