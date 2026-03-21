import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server'
import path from 'path'
import fs from 'fs'

export async function POST(request: NextRequest) {
    try {
        const { videoUrl } = await request.json()

        if (!videoUrl || typeof videoUrl !== 'string') {
            return NextResponse.json({ success: false, error: 'videoUrl is required' }, { status: 400 })
        }

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            return NextResponse.json({ success: false, error: 'Missing Gemini API Key' }, { status: 500 })
        }

        // Resolve URL path to disk path (videoUrl is like /recordings/step-2.mp4)
        const relativePath = videoUrl.startsWith('/') ? videoUrl.slice(1) : videoUrl
        const diskPath = path.join(process.cwd(), 'public', relativePath)

        if (!fs.existsSync(diskPath)) {
            return NextResponse.json({ success: false, error: `Video file not found: ${diskPath}` }, { status: 404 })
        }

        const filename = path.basename(diskPath)
        console.log(`[analyze-video] Uploading ${filename} to Gemini...`)

        // Upload to Google AI File Manager
        const fileManager = new GoogleAIFileManager(apiKey)
        const uploadResult = await fileManager.uploadFile(diskPath, {
            mimeType: 'video/mp4',
            displayName: filename,
        })

        const uploadName = uploadResult.file.name

        // Poll until processing is complete (max 60s)
        let file = await fileManager.getFile(uploadName)
        let attempts = 0
        while (file.state === FileState.PROCESSING && attempts < 30) {
            await new Promise((resolve) => setTimeout(resolve, 2000))
            file = await fileManager.getFile(uploadName)
            attempts++
        }

        if (file.state === FileState.FAILED) {
            await fileManager.deleteFile(uploadName).catch(() => {})
            return NextResponse.json({ success: false, error: 'Video processing failed on Gemini side' }, { status: 500 })
        }

        console.log(`[analyze-video] Analyzing ${filename} with Gemini...`)

        // Analyze with Gemini 2.0 Flash
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        const prompt = `You are the Creator and Lead Architect of this software, with over 20 years of deep industry experience. You are personally walking a user through your creation.

Analyze this software tutorial video clip and provide:
1. A concise, descriptive step title (5-8 words max, e.g. "Navigate to the Dashboard" or "Configure Email Notifications")
2. A 2-3 sentence narration in the voice of the Founder — confident, knowledgeable, proud of the tool. Start with "In this step..." Explain not just what is happening, but the intent and benefit of this feature.

Respond in this exact format:
TITLE: <title here>
NARRATION: <narration here>`

        const result = await model.generateContent([
            { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
            { text: prompt },
        ])

        const responseText = result.response.text()

        // Parse title and narration
        const titleMatch = responseText.match(/TITLE:\s*(.+)/i)
        const narrationMatch = responseText.match(/NARRATION:\s*([\s\S]+)/i)

        const title = titleMatch ? titleMatch[1].trim() : 'Video Step'
        const narration = narrationMatch ? narrationMatch[1].trim() : responseText.trim()

        // Cleanup remote file
        await fileManager.deleteFile(uploadName).catch(() => {})

        console.log(`[analyze-video] Done: ${title}`)
        return NextResponse.json({ success: true, title, narration })

    } catch (error: any) {
        console.error('[analyze-video] Error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Unknown error' },
            { status: 500 }
        )
    }
}
