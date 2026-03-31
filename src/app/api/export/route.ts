import { NextRequest, NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType } from 'docx'

interface Step {
    id: string
    title: string
    action: string
    narration: string
    screenshot?: string
    waitTime?: number
}

export async function POST(request: NextRequest) {
    try {
        const { projectName, steps } = await request.json()

        if (!steps || steps.length === 0) {
            return NextResponse.json(
                { error: 'No steps provided' },
                { status: 400 }
            )
        }

        // Create document sections
        const docSections: Paragraph[] = []

        // Title
        docSections.push(
            new Paragraph({
                text: projectName || 'Training Tutorial',
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 400 },
            })
        )

        // Introduction
        docSections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'This tutorial will guide you through the key features and functionality. Follow along with each step to get the most out of this training.',
                        size: 24,
                    }),
                ],
                spacing: { after: 600 },
            })
        )

        // Process each step
        for (let i = 0; i < steps.length; i++) {
            const step: Step = steps[i]

            // Step heading
            docSections.push(
                new Paragraph({
                    text: `Step ${i + 1}: ${step.title}`,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 400, after: 200 },
                })
            )

            // Add screenshot if available
            if (step.screenshot) {
                try {
                    // Extract base64 data
                    const base64Data = step.screenshot.replace(/^data:image\/\w+;base64,/, '')
                    const imageBuffer = Buffer.from(base64Data, 'base64')

                    docSections.push(
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: imageBuffer,
                                    transformation: {
                                        width: 600,
                                        height: 400,
                                    },
                                }),
                            ],
                            spacing: { after: 200 },
                            alignment: AlignmentType.CENTER,
                        })
                    )
                } catch (error) {
                    console.error(`Error adding screenshot for step ${i + 1}:`, error)
                }
            }

            // Narration text
            if (step.narration) {
                docSections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: step.narration,
                                size: 24,
                            }),
                        ],
                        spacing: { after: 400 },
                    })
                )
            }

            // Add separator
            if (i < steps.length - 1) {
                docSections.push(
                    new Paragraph({
                        text: '',
                        spacing: { after: 200 },
                        border: {
                            bottom: {
                                color: 'CCCCCC',
                                space: 1,
                                style: 'single',
                                size: 6,
                            },
                        },
                    })
                )
            }
        }

        // Conclusion
        docSections.push(
            new Paragraph({
                text: '',
                spacing: { before: 400 },
            })
        )
        docSections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'Congratulations! You\'ve completed this tutorial. You should now be familiar with the key features and ready to start using the application effectively.',
                        size: 24,
                        italics: true,
                    }),
                ],
            })
        )

        // Create the document
        const doc = new Document({
            sections: [
                {
                    children: docSections,
                },
            ],
        })

        // Generate buffer
        const buffer = await Packer.toBuffer(doc)

        // Return as downloadable file
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${projectName || 'tutorial'}.docx"`,
            },
        })

    } catch (error) {
        console.error('Export error:', error)
        return NextResponse.json(
            { error: 'Failed to export document', details: String(error) },
            { status: 500 }
        )
    }
}
