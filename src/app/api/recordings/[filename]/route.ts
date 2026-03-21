import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Serves recorded videos from /tmp/recordings/ on Vercel (not publicly accessible)
// or from public/recordings/ locally (already served statically, but this still works).
export async function GET(
    request: NextRequest,
    { params }: { params: { filename: string } }
) {
    const { filename } = params

    // Sanitize: allow only safe filenames (alphanumeric, dash, underscore, dot)
    if (!/^[\w\-]+\.mp4$/.test(filename)) {
        return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const dir = process.env.VERCEL
        ? '/tmp/recordings'
        : path.join(process.cwd(), 'public', 'recordings')

    const filePath = path.join(dir, filename)

    if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'Recording not found' }, { status: 404 })
    }

    const stat = fs.statSync(filePath)
    const fileBuffer = fs.readFileSync(filePath)

    return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': stat.size.toString(),
            'Cache-Control': 'no-store',
        },
    })
}
