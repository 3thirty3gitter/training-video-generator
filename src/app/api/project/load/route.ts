
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { firestoreEnabled, loadProjectFromFirestore, deleteProjectFromFirestore } from '@/lib/firestore'

const STORAGE_PATH = path.join(process.cwd(), 'project_data.json')

export async function GET() {
    try {
        if (firestoreEnabled()) {
            const data = await loadProjectFromFirestore()
            return NextResponse.json(data ?? { projectName: '', appUrl: '', steps: [] })
        }
        if (!fs.existsSync(STORAGE_PATH)) {
            return NextResponse.json({ projectName: '', appUrl: '', steps: [] })
        }
        const data = fs.readFileSync(STORAGE_PATH, 'utf8')
        return NextResponse.json(JSON.parse(data))
    } catch (error) {
        console.error('[Storage] Load failed:', error)
        return NextResponse.json({ error: 'Failed to load project' }, { status: 500 })
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
