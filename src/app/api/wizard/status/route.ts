import { NextResponse } from 'next/server'
import { getWizardStatus } from '@/lib/wizard-status'

export async function GET() {
    return NextResponse.json({ status: getWizardStatus() })
}
