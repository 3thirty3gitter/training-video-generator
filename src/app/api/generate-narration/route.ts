import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
    let title = ''
    let action = ''
    let context = ''
    let screenshot = ''

    try {
        // Parse request body
        const body = await request.json()

        // Handle both flattened body and nested 'step' object
        const step = body.step || {}
        title = step.title || body.title || ''
        action = step.action || body.action || ''
        context = step.context || body.context || ''
        screenshot = step.screenshot || body.screenshot || ''

        console.log('📝 Narration request:', {
            title,
            action,
            context,
            hasScreenshot: !!screenshot
        })

        // Check if Gemini API key is configured
        const apiKey = process.env.GEMINI_API_KEY

        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            console.error('❌ Gemini API key not configured')
            return NextResponse.json({
                success: false,
                error: 'Gemini API key is missing. Please configure GEMINI_API_KEY in your environment variables.'
            }, { status: 500 })
        }

        console.log('🤖 Using Gemini AI to generate narration...')

        const genAI = new GoogleGenerativeAI(apiKey)

        // Use gemini-2.5-flash which is explicitly listed as supported
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

        // Create a professional prompt for narration generation
        const actionText = action ? `\nAction: ${action}` : ''
        const screenshotText = screenshot
            ? '\n\nIMPORTANT: Analyze the screenshot provided and describe what the user will see and do in this step. Be specific about UI elements, buttons, or features visible in the image.'
            : ''

        const textPrompt = `You are the Creator and Lead Architect of this software, with over 20 years of deep industry experience. You are personally walking a user through your creation.

CONTEXT:
We are creating a high-end video tutorial for a SaaS application.
PROJECT CONTEXT/KEYWORDS: ${context || 'Professional Software Training'}
Current Step Title: ${title}
Action Being Performed: ${action}${actionText}${screenshotText}

TASK:
Write the voiceover script for THIS SPECIFIC STEP.

GUIDELINES:
1. **Persona**: You are the Founder. You speak with quiet confidence, deep knowledge, and pride in the tool's efficiency. You don't need to sell it; the quality speaks for itself.
2. **Focus**: Explain the *intent* behind the design. Why did you build it this way? (e.g., "I designed this dashboard to give you instant visibility..." or "We streamlined this process so you can...")
3. **Visual Connection**: Point out specific details affecting the workflow.
4. **Flow**: Smooth and logical. Connect the action to the user's larger goal.
5. **Tone**: Professional, visionary, and grounded. Avoid marketing fluff (no "game-changer" or "amazing"). Use words like "efficient", "precise", "control", "streamlined".
6. **Length & Pacing (CRITICAL)**: 
   - **CHECK THE CONTEXT**: Did the user specify a video length (e.g., "1:30", "45s")? 
   - **CALCULATE**: Target approx 130-150 words per minute. (e.g. 1 min = ~140 words; 30s = ~70 words).
   - **IF SHORT**: If no time is given, keep it concise (2 sentences).
   - **IF LONG**: You MUST expand. Do not just describe the action. engagingly describe the *philosophy*, the *benefits*, and the *exclusive details* of this feature to fill the time. Speak slowly and meaningfully.

OUTPUT:
Return ONLY the narration text. Do not include labels like "Narration:" or quotes.`

        // Prepare content parts
        const parts: any[] = [textPrompt]

        if (screenshot && screenshot.startsWith('data:')) {
            console.log('📸 Including screenshot analysis in narration generation')
            // Remove data:image/png;base64, prefix if present
            const base64Data = screenshot.split(',')[1]

            if (base64Data) {
                parts.push({
                    inlineData: {
                        data: base64Data,
                        mimeType: 'image/png'
                    }
                })
            }
        } else if (screenshot) {
            console.warn('⚠️ Screenshot provided but not a valid data URI. Skipping visual analysis.', screenshot.substring(0, 50))
        }

        const result = await model.generateContent(parts)
        const narration = result.response.text()

        if (!narration) {
            throw new Error('No narration generated from Gemini')
        }

        console.log('✅ Gemini AI generated narration successfully', screenshot ? '(with screenshot analysis)' : '')

        return NextResponse.json({
            success: true,
            narration,
            source: screenshot ? 'gemini-vision' : 'gemini'
        })

    } catch (error) {
        console.error('❌ Narration generation error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown generation error'
        }, { status: 500 })
    }
}
