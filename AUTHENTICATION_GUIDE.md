# 🔐 How to Capture Screenshots Behind a Login

If your application requires authentication (login), follow these steps to capture screenshots successfully.

## The Problem

Previously, the tool opened a fresh browser instance every time, requiring you to log in repeatedly.

## The Solution: Interactive Mode + Session Persistence

1. **Interactive Mode**: Use the "Need to Log In?" checkbox to pause execution and log in manually.
2. **Session Persistence**: The tool now **saves your login session** (cookies, etc.) in a local folder. This means **you usually only need to log in ONCE**. On subsequent runs, you can uncheck "Need to Log In?" and it should remember you!

### 📝 Step-by-Step Instructions

1. **Enter your Project Info**
   - URL: `https://your-private-app.com`

2. **Add your Steps**
   - E.g., "Navigate to Dashboard"

3. **Enable Interactive Mode**
   - Check the box: **☑️ Need to Log In?**
   - Select a wait time: **30 seconds** is usually enough.

4. **Click "Capture All Screenshots"**

5. **👀 Watch for the Browser Window**
   - A generic Chrome/Chromium window will pop up.
   - It will load your app URL.
   - You will see a big red warning: **"⚠️ PLEASE LOG IN NOW!"**

6. **🔑 Log In Manually**
   - Quickly type your username/password and log in.
   - **Do this within the 30 seconds!**
   - Navigate to the starting page (e.g., Dashboard).

7. **Wait / Hands Off** ✋
   - Once the timer runs out, the automation will take over.
   - It will run through your steps and capture screenshots using your now-authenticated session.

### 💡 Tips

- **Don't close the window!** Let it close automatically when done.
- **Extend the time:** If 30s isn't enough, choose "1 minute" or "2 minutes".
- **Two-Factor Auth (2FA):** This mode works perfectly for 2FA since you handle the login manually.

## Troubleshooting

- **"I logged in but it didn't capture properly"**
  - Make sure you are on the correct starting page before the timer runs out.
  
- **"The browser never opened"**
  - Check your taskbar, it might be behind other windows.
