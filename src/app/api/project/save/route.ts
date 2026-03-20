
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { firestoreEnabled, saveProjectToFirestore } from '@/lib/firestore'

const STORAGE_PATH = path.join(process.cwd(), 'project_data.json')

export async function POST(request: NextRequest) {
    try {
        const data = await request.json()
        if (firestoreEnabled()) {
            await saveProjectToFirestore(data)
            console.log(`[Storage] Project saved to Firestore (${JSON.stringify(data).length} bytes)`)
        } else {
            fs.writeFileSync(STORAGE_PATH, JSON.stringify(data, null, 2))
            console.log(`[Storage] Project saved to ${STORAGE_PATH} (${JSON.stringify(data).length} bytes)`)
        }
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Storage] Save failed:', error)
        return NextResponse.json({ error: 'Failed to save project' }, { status: 500 })
    }
}
