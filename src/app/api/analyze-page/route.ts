import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json()

        if (!url) {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            )
        }

        console.log(`Wizard: Starting Interactive Capture for ${url}`)

        // 1. Launch Puppeteer Visibly
        const browser = await puppeteer.launch({
            headless: false, // Visible!
            defaultViewport: null,
            userDataDir: './.puppeteer_data',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--start-maximized',
            ],
        })

        const page = await browser.pages().then(pages => pages[0] || browser.newPage())
        await page.setViewport({ width: 1920, height: 1080 })

        // 2. Navigate
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

        // 3. Inject "Capture" Button & Wait
        await page.evaluate(() => {
            const btn = document.createElement('button');
            btn.id = 'gemini-wizard-capture-btn';
            btn.innerHTML = '✨ Capture & Analyze Step';
            btn.style.position = 'fixed';
            btn.style.bottom = '30px';
            btn.style.right = '30px';
            btn.style.zIndex = '999999';
            btn.style.padding = '15px 30px';
            btn.style.backgroundColor = '#7c3aed'; // Purple-600
            btn.style.color = 'white';
            btn.style.border = 'none';
            btn.style.borderRadius = '50px';
            btn.style.fontSize = '18px';
            btn.style.fontWeight = 'bold';
            btn.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.5)';
            btn.style.cursor = 'pointer';
            btn.style.transition = 'transform 0.2s, box-shadow 0.2s';

            // Hover effect
            btn.onmouseover = () => {
                btn.style.transform = 'scale(1.05)';
                btn.style.boxShadow = '0 15px 35px rgba(124, 58, 237, 0.6)';
            };
            btn.onmouseout = () => {
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.5)';
            };

            // Click handler (sets a window variable we can watch for)
            btn.onclick = () => {
                btn.innerText = '📸 Capturing...';
                btn.style.backgroundColor = '#334155'; // Slate-700
                (window as any)._GEMINI_WIZARD_CLICKED = true;
            };

            document.body.appendChild(btn);
        });

        // Wait for the button to be clicked
        console.log('Wizard: Waiting for user to click capture...');
        await page.waitForFunction(() => (window as any)._GEMINI_WIZARD_CLICKED === true, { timeout: 0 }); // No timeout

        // Remove button before screenshot
        await page.evaluate(() => {
            const btn = document.getElementById('gemini-wizard-capture-btn');
            if (btn) btn.remove();
        });

        // Small delay for UI to clear
        await page.waitForTimeout(500);

        // Get final URL (user might have navigated)
        const finalUrl = page.url();
        const pageTitle = await page.title();

        // 4. Extract Links & Buttons (Same as before)
        const interactiveElements = await page.evaluate(() => {
            const elements: any[] = []

            const getSelector = (el: Element): string => {
                if (el.id) return `#${el.id}`
                if (el.className && typeof el.className === 'string') {
                    const classes = el.className.split(' ').filter(c => c.trim().length > 0).join('.')
                    if (classes) return `.${classes}`
                }
                return el.tagName.toLowerCase()
            }

            // Find Links
            document.querySelectorAll('a').forEach(a => {
                const text = a.innerText.trim() || a.getAttribute('aria-label') || ''
                const href = a.getAttribute('href')
                if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                    const rect = a.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) { // Visible check
                        elements.push({
                            type: 'link',
                            text: text.substring(0, 50),
                            href: href,
                            selector: getSelector(a),
                            action: `navigate to ${href}`
                        })
                    }
                }
            })

            // Find Buttons
            document.querySelectorAll('button').forEach(btn => {
                const text = btn.innerText.trim() || btn.getAttribute('aria-label') || ''
                if (text) {
                    const rect = btn.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        elements.push({
                            type: 'button',
                            text: text.substring(0, 50),
                            selector: getSelector(btn),
                            action: `click ${getSelector(btn)}`
                        })
                    }
                }
            })

            return elements.slice(0, 20)
        });

        // 5. Capture Screenshot
        const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });

        await browser.close();

        // 6. Gemini Vision Analysis
        let narration = ''
        const apiKey = process.env.GEMINI_API_KEY

        if (apiKey && apiKey !== 'your_gemini_api_key_here') {
            try {
                const genAI = new GoogleGenerativeAI(apiKey)
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

                const prompt = `This is a screenshot of a software application page titled "${pageTitle}".
                Write a 2-sentence welcome message or summary for a user guide that explains what this page is.
                Start with "Welcome to..." or "This is the..."`

                const result = await model.generateContent([
                    prompt,
                    { inlineData: { data: screenshot, mimeType: 'image/png' } }
                ])
                narration = result.response.text()
            } catch (err) {
                console.error('Wizard: Gemini analysis failed', err)
                narration = `Welcome to the ${pageTitle}.`
            }
        }

        return NextResponse.json({
            success: true,
            pageTitle,
            finalUrl, // Return this so UI knows where we ended up
            screenshot: `data:image/png;base64,${screenshot}`,
            narration: narration || `Welcome to the ${pageTitle}.`,
            suggestedActions: interactiveElements
        })

    } catch (error) {
        console.error('Wizard Interactive Error:', error)
        return NextResponse.json(
            { error: 'Failed to capture page', details: String(error) },
            { status: 500 }
        )
    }
}
