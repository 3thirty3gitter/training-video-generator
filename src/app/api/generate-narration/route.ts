import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { title, action, context } = await request.json()

        // Simple template-based narration generation
        // In production, you could integrate with OpenAI API or similar

        const templates = [
            `In this step, we'll ${action}. This is an important part of ${context || 'using the application'}.`,
            `Now, let's ${action}. ${title} shows how to accomplish this effectively.`,
            `Next, we're going to ${action}. This feature is essential for ${context || 'getting the most out of the platform'}.`,
            `Here's how to ${action}. This step demonstrates ${title.toLowerCase()}.`,
        ]

        const narration = templates[Math.floor(Math.random() * templates.length)]

        return NextResponse.json({
            success: true,
            narration
        })

    } catch (error) {
        console.error('Narration generation error:', error)
        return NextResponse.json(
            { error: 'Failed to generate narration', details: String(error) },
            { status: 500 }
        )
    }
}
