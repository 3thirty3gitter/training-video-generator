/**
 * Firestore client — singleton using Firebase Admin SDK.
 *
 * Activated when FIREBASE_PROJECT_ID env var is set.
 * Falls back gracefully (returns null) when not configured,
 * so local dev continues to use the filesystem.
 */

import * as admin from 'firebase-admin'

const COLLECTION = 'projects'
const DEFAULT_DOC = 'current'

function getApp(): admin.app.App | null {
    const projectId = process.env.FIREBASE_PROJECT_ID
    if (!projectId) return null

    // Reuse existing app if already initialised
    if (admin.apps.length > 0) {
        return admin.app()
    }

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (clientEmail && privateKey) {
        // Service account credentials supplied via env vars
        return admin.initializeApp({
            credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        })
    }

    // No explicit credentials — use Application Default Credentials
    // (works on Cloud Run, GKE, and locally with `gcloud auth application-default login`)
    return admin.initializeApp({ projectId })
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
