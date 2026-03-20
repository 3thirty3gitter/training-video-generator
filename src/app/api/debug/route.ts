import { NextResponse } from 'next/server'
import * as admin from 'firebase-admin'

// Diagnostic endpoint — returns Firestore init status and any errors.
// Visit /api/debug on your deployment to see why Firestore may be failing.
export async function GET() {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? ''

    const status: Record<string, unknown> = {
        FIREBASE_PROJECT_ID: projectId ? `set (${projectId})` : 'MISSING',
        FIREBASE_CLIENT_EMAIL: clientEmail ? `set (${clientEmail})` : 'MISSING',
        FIREBASE_PRIVATE_KEY: rawKey
            ? `set (${rawKey.length} chars, starts: ${rawKey.substring(0, 27)}...)`
            : 'MISSING',
        privateKeyHasLiteralNewlines: rawKey.includes('\\n'),
        privateKeyHasRealNewlines: rawKey.includes('\n'),
        adminAppsCount: admin.apps.length,
    }

    // Try a live Firestore read
    try {
        const { getFirestore } = await import('@/lib/firestore')
        const db = getFirestore()
        if (!db) {
            status.firestoreResult = 'getFirestore() returned null — check env vars above'
        } else {
            await db.collection('_health').doc('ping').set({ ts: Date.now() })
            await db.collection('_health').doc('ping').delete()
            status.firestoreResult = 'OK — read/write succeeded'
        }
    } catch (err) {
        status.firestoreResult = `ERROR: ${String(err)}`
    }

    return NextResponse.json(status)
}
