
import { NextRequest, NextResponse } from 'next/server'
import { closeBrowserSession } from '@/lib/browser-session'
import { clearWizardStatus } from '@/lib/wizard-status'

export async function POST(request: NextRequest) {
    try {
        console.log('Wizard: Stop request')
        await closeBrowserSession()
        clearWizardStatus()
        return NextResponse.json({ success: true, status: 'stopped' })
    } catch (error) {
        console.error('Wizard Stop Error:', error)
        return NextResponse.json(
            { error: 'Failed to stop browser', details: String(error) },
            { status: 500 }
        )
    }
}
