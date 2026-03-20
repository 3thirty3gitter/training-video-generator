
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { firestoreEnabled, loadProjectFromFirestore, deleteProjectFromFirestore } from '@/lib/firestore'

const STORAGE_PATH = process.env.VERCEL
    ? path.join(os.tmpdir(), 'project_data.json')
    : path.join(process.cwd(), 'project_data.json')

export async function GET() {
    try {
        if (firestoreEnabled()) {
            try {
                const data = await loadProjectFromFirestore()
                console.log('[Storage] Loaded from Firestore')
                return NextResponse.json(data ?? { projectName: '', appUrl: '', steps: [] })
            } catch (firestoreErr) {
                console.error('[Storage] Firestore load failed, falling back to disk:', firestoreErr)
                // Fall through to filesystem fallback
            }
        }
        if (!fs.existsSync(STORAGE_PATH)) {
            return NextResponse.json({ projectName: '', appUrl: '', steps: [] })
        }
        const data = fs.readFileSync(STORAGE_PATH, 'utf8')
        return NextResponse.json(JSON.parse(data))
    } catch (error) {
        console.error('[Storage] Load failed:', error)
        return NextResponse.json({ projectName: '', appUrl: '', steps: [] })
    }
}

export async function POST() {
    // For clearing data
    try {
        if (firestoreEnabled()) {
            await deleteProjectFromFirestore()
        } else if (fs.existsSync(STORAGE_PATH)) {
            fs.unlinkSync(STORAGE_PATH)
        }
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to clear project' }, { status: 500 })
    }
}
