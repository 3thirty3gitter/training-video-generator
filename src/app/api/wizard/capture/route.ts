
import { NextRequest, NextResponse } from 'next/server'
import { getBrowserSession } from '@/lib/browser-session'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { processAndAnalyzeVideo } from '@/lib/video-analysis'
import { startRecording } from '@/lib/video-recorder'
import path from 'path'
import fs from 'fs'

const LOG_FILE = path.join(process.cwd(), 'wizard_debug.log')
function debugLog(msg: string) {
    const entry = `[${new Date().toISOString()}] ${msg}\n`
    fs.appendFileSync(LOG_FILE, entry)
    console.log(msg)
}

async function waitForWizardInteraction(browser: any, mode: 'snapshot' | 'video', reset: boolean = false) {
    const LOOP_DELAY = 1000;
    const MAX_WAIT_TIME = 600000;
    const startTime = Date.now();

    debugLog(`Wizard: Waiting for ${mode} interaction... (Reset: ${reset})`);

    // Handle Reset UI (Inject "Ready" message)
    if (reset) {
        try {
            const pages = await browser.pages();
            const activePage = pages[pages.length - 1]; // Assume last page is active
            if (activePage) {
                await activePage.evaluate(() => {
                    // Reset Button State
                    const btn = document.getElementById('gemini-wizard-btn');
                    if (btn) {
                        btn.style.visibility = 'visible';
                        btn.innerHTML = '🎥 Start Record';
                        btn.style.backgroundColor = '#ef4444';
                        btn.style.animation = 'none';
                        (window as any)._IS_RECORDING = false;
                    }

                    // Show "Ready" Toast
                    const toast = document.createElement('div');
                    toast.innerText = '✅ Ready to Record';
                    Object.assign(toast.style, {
                        position: 'fixed', bottom: '100px', right: '20px',
                        backgroundColor: '#22c55e', color: 'white', padding: '10px 20px',
                        borderRadius: '8px', zIndex: '9999999', transition: 'opacity 1s',
                        fontFamily: 'system-ui, sans-serif', fontWeight: 'bold',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    });
                    document.body.appendChild(toast);
                    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 1000) }, 2000);
                });
            }
        } catch (e) {
            debugLog(`Failed to reset UI: ${e}`);
        }
    }

    while (Date.now() - startTime < MAX_WAIT_TIME) {
        try {
            const pages = await browser.pages();

            for (const page of pages) {
                try {
                    const url = await page.url();
                    if (url === 'about:blank' || url.startsWith('chrome-extension://')) continue;

                    // 1. Check if interaction occurred
                    const interaction = await page.evaluate(() => {
                        const state = (window as any)._GEMINI_WIZARD_INTERACTION;
                        if (state) {
                            (window as any)._GEMINI_WIZARD_INTERACTION = null; // Consume
                            return state;
                        }
                        return null;
                    }).catch(() => null);

                    if (interaction) {
                        debugLog(`Wizard: Interaction detected: ${interaction}`);

                        if (interaction === 'start_recording') {
                            console.log('Wizard: Starting screen recorder...');
                            const webPath = await startRecording(page);
                            // Clear the interaction flag on the page immediately so
                            // concurrent capture poll requests don't re-detect it
                            await page.evaluate(() => {
                                (window as any)._GEMINI_WIZARD_INTERACTION = null;
                            }).catch(() => {});
                            return { action: 'started_recording', title: await page.title() };
                        }

                        if (interaction === 'stop_recording') {
                            // Brief pause so the button-hide frame is captured
                            // before ffmpeg flushes — keeps the overlay out of
                            // the last frames of the recording
                            await new Promise(r => setTimeout(r, 400));
                            return { action: 'stop_recording', page };
                        }

                        if (interaction === 'snapshot') {
                            return { action: 'snapshot', page };
                        }
                    }

                    // 2. Inject context-aware UI
                    const isActive = page === pages[pages.length - 1];
                    if (isActive) {
                        await page.evaluate((m: 'snapshot' | 'video') => {
                            if (document.getElementById('gemini-wizard-btn')) {
                                // Update button state if recording started elsewhere
                                const btn = document.getElementById('gemini-wizard-btn')!;
                                if ((window as any)._IS_RECORDING && !btn.innerText.includes('STOP')) {
                                    btn.innerHTML = '⏹ STOP (Space)';
                                    btn.style.backgroundColor = '#000';
                                    btn.style.animation = 'wizard-pulse 1.5s infinite';
                                }
                                return;
                            }

                            const btn = document.createElement('button');
                            btn.id = 'gemini-wizard-btn';
                            btn.style.position = 'fixed';
                            btn.style.bottom = '20px';
                            btn.style.right = '20px';
                            btn.style.zIndex = '2147483647';
                            btn.style.padding = '12px 24px';
                            btn.style.color = 'white';
                            btn.style.border = 'none';
                            btn.style.borderRadius = '30px';
                            btn.style.fontWeight = 'bold';
                            btn.style.cursor = 'pointer';
                            btn.style.fontFamily = 'system-ui, sans-serif';
                            btn.style.transition = 'all 0.2s';
                            btn.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';

                            if (m === 'snapshot') {
                                btn.innerHTML = '✨ Capture Step';
                                btn.style.backgroundColor = '#7c3aed';
                                btn.onclick = () => {
                                    btn.innerText = '📸 Processing...';
                                    (window as any)._GEMINI_WIZARD_INTERACTION = 'snapshot';
                                };
                            } else {
                                btn.innerHTML = '🎥 Start Record';
                                btn.style.backgroundColor = '#ef4444';

                                const toggleRec = () => {
                                    if ((window as any)._IS_RECORDING) {
                                        // STOP — hide button immediately so it doesn't
                                        // appear in the last frames of the recording
                                        (window as any)._IS_RECORDING = false;
                                        btn.style.visibility = 'hidden';
                                        (window as any)._GEMINI_WIZARD_INTERACTION = 'stop_recording';
                                    } else {
                                        // START
                                        (window as any)._IS_RECORDING = true;
                                        // Hide button IMMEDIATELY before signaling backend
                                        btn.style.visibility = 'hidden';
                                        (window as any)._GEMINI_WIZARD_INTERACTION = 'start_recording';
                                    }
                                };

                                btn.onclick = toggleRec;

                                if (!(window as any)._WIZARD_LISTENER_ADDED) {
                                    window.addEventListener('keydown', (e) => {
                                        if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
                                            e.preventDefault();
                                            toggleRec();
                                        }
                                    });
                                    (window as any)._WIZARD_LISTENER_ADDED = true;
                                }

                                // Inject Virtual Cursor
                                if (!document.getElementById('gemini-virtual-cursor')) {
                                    const cursor = document.createElement('div');
                                    cursor.id = 'gemini-virtual-cursor';
                                    cursor.style.width = '20px';
                                    cursor.style.height = '20px';
                                    cursor.style.backgroundColor = 'rgba(255, 255, 0, 0.6)';
                                    cursor.style.border = '2px solid rgba(255, 255, 255, 0.8)';
                                    cursor.style.borderRadius = '50%';
                                    cursor.style.position = 'fixed';
                                    cursor.style.pointerEvents = 'none';
                                    cursor.style.zIndex = '2147483646';
                                    cursor.style.transition = 'transform 0.1s ease-out';
                                    cursor.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
                                    document.body.appendChild(cursor);

                                    cursor.style.left = '0';
                                    cursor.style.top = '0';
                                    cursor.style.transition = 'none'; // Manual control for max smoothness

                                    let mouseX = 0;
                                    let mouseY = 0;
                                    let cursorX = 0;
                                    let cursorY = 0;

                                    window.addEventListener('mousemove', (e) => {
                                        mouseX = e.clientX;
                                        mouseY = e.clientY;
                                    });

                                    function animateCursor() {
                                        // Smoother interpolation (lerp)
                                        // Higher value = faster following
                                        const ease = 0.15;
                                        cursorX += (mouseX - cursorX) * ease;
                                        cursorY += (mouseY - cursorY) * ease;

                                        cursor.style.transform = `translate(${cursorX - 10}px, ${cursorY - 10}px)`;
                                        requestAnimationFrame(animateCursor);
                                    }
                                    requestAnimationFrame(animateCursor);

                                    window.addEventListener('mousedown', (e) => {
                                        const ripple = document.createElement('div');
                                        ripple.style.position = 'fixed';
                                        ripple.style.left = `${e.clientX - 15}px`;
                                        ripple.style.top = `${e.clientY - 15}px`;
                                        ripple.style.width = '30px';
                                        ripple.style.height = '30px';
                                        ripple.style.border = '4px solid #ef4444';
                                        ripple.style.borderRadius = '50%';
                                        ripple.style.pointerEvents = 'none';
                                        ripple.style.zIndex = '2147483645';
                                        ripple.style.animation = 'gemini-ripple 0.4s ease-out forwards';
                                        document.body.appendChild(ripple);
                                        setTimeout(() => ripple.remove(), 400);
                                    });

                                    const style = document.createElement('style');
                                    style.innerHTML = `
                                        @keyframes gemini-ripple {
                                            from { transform: scale(1); opacity: 1; border-width: 4px; }
                                            to { transform: scale(2.5); opacity: 0; border-width: 1px; }
                                        }
                                        @keyframes wizard-pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
                                    `;
                                    document.head.appendChild(style);
                                }
                            }

                            document.body.appendChild(btn);
                        }, mode).catch(() => { });
                    }

                } catch (err) {
                    debugLog(`Page loop error: ${err}`);
                    throw err; // Don't swallow
                }
            }
        } catch (error) {
            debugLog(`Outer loop error: ${error}`);
            throw error; // Don't swallow
        }
        await new Promise(resolve => setTimeout(resolve, LOOP_DELAY));
    }
    throw new Error('Timeout waiting for interaction');
}

export async function POST(request: NextRequest) {
    try {
        const { mode = 'snapshot', reset = false } = await request.json();
        const browser = await getBrowserSession()

        if (!browser) {
            return NextResponse.json({ error: 'No active browser session' }, { status: 404 })
        }

        const result: any = await waitForWizardInteraction(browser, mode, reset)

        if (result.action === 'started_recording') {
            return NextResponse.json({ success: true, action: 'started_recording', title: result.title });
        }

        if (result.action === 'stop_recording') {
            console.log('Wizard: Browser triggered STOP. Processing analysis...');
            const pageTitle = await result.page.title().catch(() => 'Recorded Step');
            const data = await processAndAnalyzeVideo(pageTitle);
            return NextResponse.json(data);
        }

        const { page } = result;
        const finalUrl = page.url()
        const pageTitle = await page.title()

        await page.evaluate(() => {
            const b = document.getElementById('gemini-wizard-btn');
            if (b) b.remove();
        }).catch(() => { });

        const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false })

        let narration = ''
        const apiKey = process.env.GEMINI_API_KEY
        if (apiKey && apiKey !== 'your_gemini_api_key_here') {
            try {
                const genAI = new GoogleGenerativeAI(apiKey)
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
                const prompt = `Page: ${pageTitle}\nDraft a 2-sentence guide intro for this screen.`
                const res = await model.generateContent([
                    prompt,
                    { inlineData: { data: screenshot, mimeType: 'image/png' } }
                ])
                narration = res.response.text()
            } catch (err) { narration = `Welcome to the ${pageTitle}.` }
        } else {
            narration = `Welcome to the ${pageTitle}.`
        }

        return NextResponse.json({
            success: true,
            title: pageTitle,
            url: finalUrl,
            screenshot: `data:image/png;base64,${screenshot}`,
            narration,
            action: `navigate to ${finalUrl}`,
            type: 'image'
        })

    } catch (error) {
        const msg = `CRITICAL Wizard Capture Error: ${error}\n${error instanceof Error ? error.stack : ''}`;
        debugLog(msg);
        return NextResponse.json({ error: 'Capture failed', details: String(error) }, { status: 500 })
    }
}
