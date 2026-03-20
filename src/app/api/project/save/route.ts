
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { firestoreEnabled, saveProjectToFirestore } from '@/lib/firestore'

// Vercel's /var/task is read-only. Use /tmp for filesystem fallback.
const STORAGE_PATH = process.env.VERCEL
    ? path.join(os.tmpdir(), 'project_data.json')
    : path.join(process.cwd(), 'project_data.json')

export async function POST(request: NextRequest) {
    try {
        const data = await request.json()
        if (firestoreEnabled()) {
            try {
                await saveProjectToFirestore(data)
                console.log(`[Storage] Saved to Firestore (${JSON.stringify(data).length} bytes)`)
                return NextResponse.json({ success: true })
            } catch (firestoreErr) {
                console.error('[Storage] Firestore save failed, falling back to disk:', firestoreErr)
                // Fall through to filesystem fallback
            }
        }
        fs.writeFileSync(STORAGE_PATH, JSON.stringify(data, null, 2))
        console.log(`[Storage] Saved to disk at ${STORAGE_PATH} (${JSON.stringify(data).length} bytes)`)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Storage] Save failed:', error)
        return NextResponse.json({ error: 'Failed to save project' }, { status: 500 })
    }
}
