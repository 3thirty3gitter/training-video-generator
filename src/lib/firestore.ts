/**
 * Firestore client — singleton using Firebase Admin SDK.
 *
 * Activated when FIREBASE_PROJECT_ID env var is set.
 * Falls back gracefully (returns null) when not configured or on init error,
 * so local dev and fallback continues to use the filesystem.
 */

import * as admin from 'firebase-admin'

const COLLECTION = 'projects'
const DEFAULT_DOC = 'current'

let _initError: string | null = null

function getApp(): admin.app.App | null {
    const projectId = process.env.FIREBASE_PROJECT_ID
    if (!projectId) return null

    // If a previous init attempt failed, don't retry — surface the error
    if (_initError) {
        console.error('[Firestore] Skipping init due to previous error:', _initError)
        return null
    }

    // Reuse existing app if already initialised
    if (admin.apps.length > 0) {
        return admin.app()
    }

    try {
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
        // Handle both literal \n (from env var) and already-expanded newlines
        const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? ''
        const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey

        if (clientEmail && privateKey) {
            console.log('[Firestore] Initialising with service account:', clientEmail)
            return admin.initializeApp({
                credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
            })
        }

        // No explicit credentials — use Application Default Credentials
        console.log('[Firestore] Initialising with Application Default Credentials')
        return admin.initializeApp({ projectId })
    } catch (err) {
        _initError = String(err)
        console.error('[Firestore] Initialisation failed:', err)
        return null
    }
}

export function getFirestore(): admin.firestore.Firestore | null {
    const app = getApp()
    return app ? admin.firestore(app) : null
}

// ---------------------------------------------------------------------------
// Project persistence helpers
// ---------------------------------------------------------------------------

export async function loadProjectFromFirestore(): Promise<object | null> {
    const db = getFirestore()
    if (!db) return null

    const snap = await db.collection(COLLECTION).doc(DEFAULT_DOC).get()
    if (!snap.exists) return null
    return snap.data() ?? null
}

export async function saveProjectToFirestore(data: object): Promise<void> {
    const db = getFirestore()
    if (!db) throw new Error('Firestore is not configured')

    await db.collection(COLLECTION).doc(DEFAULT_DOC).set(data)
}

export async function deleteProjectFromFirestore(): Promise<void> {
    const db = getFirestore()
    if (!db) throw new Error('Firestore is not configured')

    await db.collection(COLLECTION).doc(DEFAULT_DOC).delete()
}

export const firestoreEnabled = (): boolean => !!process.env.FIREBASE_PROJECT_ID
