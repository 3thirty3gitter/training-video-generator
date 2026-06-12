import path from 'path'
import fs from 'fs'

// Filesystem-based wizard status flag.
// A module-level variable doesn't work across Next.js route handlers because
// each handler may run in a separate worker context. Writing to a temp file
// guarantees all routes see the same state.
const STATUS_FILE = path.join(process.cwd(), '.wizard-status')

type WizardStatus = 'idle' | 'recording' | 'analyzing'

export function setWizardStatus(s: WizardStatus) {
    try { fs.writeFileSync(STATUS_FILE, s, 'utf-8') } catch { }
}

export function getWizardStatus(): WizardStatus {
    try { return fs.readFileSync(STATUS_FILE, 'utf-8').trim() as WizardStatus } catch { return 'idle' }
}

export function clearWizardStatus() {
    try { fs.rmSync(STATUS_FILE, { force: true }) } catch { }
}
