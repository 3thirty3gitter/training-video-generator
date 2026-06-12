import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Must be dynamic: reads project_data.json at request time.
// Without this, Next.js pre-renders the response at build time.
export const dynamic = 'force-dynamic'

const STORAGE_PATH = path.join(process.cwd(), 'project_data.json')
const TEMPLATE_PATH = path.join(process.cwd(), 'src', 'lib', 'export-template.html')

export async function GET(request: NextRequest) {
    try {
        if (!fs.existsSync(STORAGE_PATH)) {
            return NextResponse.json({ error: 'No project data found' }, { status: 404 })
        }

        const projectData = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf-8'));
        let template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

        // Inject Data
        template = template.replace(/{{PROJECT_NAME}}/g, projectData.projectName || 'Training Guide');
        template = template.replace(/{{PROJECT_STEPS}}/g, JSON.stringify(projectData.steps || []));

        // Return as downloadable file
        return new NextResponse(template, {
            headers: {
                'Content-Type': 'text/html',
                'Content-Disposition': `attachment; filename="${projectData.projectName || 'training-guide'}.html"`,
            },
        });
    } catch (error) {
        console.error('[Export] Web export failed:', error)
        return NextResponse.json({ error: 'Failed to export guide' }, { status: 500 })
    }
}
