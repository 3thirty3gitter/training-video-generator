import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
    let title = ''
    let action = ''
    let context = ''
    let screenshot = ''

    try {
        // Parse request body once and store values
        const body = await request.json()
        title = body.title || ''
        action = body.action || ''
        context = body.context || ''
        screenshot = body.screenshot || '' // Base64 screenshot

        console.log('📝 Narration request:', {
            title,
            action,
            context,
            hasScreenshot: !!screenshot
        })

        // Check if Gemini API key is configured
        const apiKey = process.env.GEMINI_API_KEY

        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            // Fallback to template-based generation if no API key
            console.warn('⚠️ Gemini API key not configured. Using template-based narration.')
            const templates = [
                `In this step, we'll ${action || 'proceed'}. This is an important part of ${context || 'using the application'}.`,
                `Now, let's ${action || 'continue'}. ${title} shows how to accomplish this effectively.`,
                `Next, we're going to ${action || 'move forward'}. This feature is essential for ${context || 'getting the most out of the platform'}.`,
                `Here's how to ${action || 'proceed'}. This step demonstrates ${title.toLowerCase()}.`,
            ]

            const narration = templates[Math.floor(Math.random() * templates.length)]

            return NextResponse.json({
                success: true,
                narration,
                source: 'template'
            })
        }

        console.log('🤖 Using Gemini AI to generate narration...')

        const genAI = new GoogleGenerativeAI(apiKey)

        // Use gemini-2.0-flash as confirmed available by test-gemini.js
        // It supports both text and vision (multimodal)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        // Create a professional prompt for narration generation
        const actionText = action ? `\nAction: ${action}` : ''
        const screenshotText = screenshot
            ? '\n\nIMPORTANT: Analyze the screenshot provided and describe what the user will see and do in this step. Be specific about UI elements, buttons, or features visible in the image.'
            : ''

        const textPrompt = `You are an expert technical writer and voiceover artist for high-quality SaaS training videos. Your goal is to write rich, descriptive, and engaging narration that guides the user through the interface.

Context: ${context || 'A software tutorial'}
Step Title: ${title}${actionText}${screenshotText}

Instructions:
1. Analyze the screenshot (if provided) in DETAIL. Identify specific UI elements, text, buttons, colors, and layout.
2. Write a 3-4 sentence narration script that:
   - Clearly explains the action the user is taking.
   - **Crucially**: Explicitly describes the visual elements they are seeing. Mention specific button names, menu items, or screen sections shown in the image.
   - Explains *why* this step is important or what the result will be.
3. Tone: Professional, encouraging, and authoritative but friendly.
4. Style: Use active voice. Make the user feel like an expert is sitting right next to them pointing at the screen.

Narration:`

        // Prepare content parts
        const parts: any[] = [textPrompt]

        if (screenshot) {
            console.log('📸 Including screenshot analysis in narration generation')
            // Remove data:image/png;base64, prefix if present
            const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '')

            parts.push({
                inlineData: {
                    data: base64Data,
                    mimeType: 'image/png'
                }
            })
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

        // Fallback to template on error (using already-parsed values)
        const fallbackNarration = action
            ? `In this step, we'll ${action}. ${title}. This is an important part of ${context || 'using the application'}.`
            : `${title}. This is an important step in the tutorial.`

        console.log('⚠️ Using fallback narration due to error')

        return NextResponse.json({
            success: true,
            narration: fallbackNarration,
            source: 'fallback',
            error: error instanceof Error ? error.message : String(error)
        })
    }
}
