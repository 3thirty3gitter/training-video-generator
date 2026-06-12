// Shared in-process wizard status flag.
// Set by the capture route, read by the status route.
let _status: 'idle' | 'recording' | 'analyzing' = 'idle'

export function setWizardStatus(s: typeof _status) { _status = s }
export function getWizardStatus() { return _status }
