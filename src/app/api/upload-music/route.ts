
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const trackName = formData.get('trackName') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }
        if (!trackName) {
            return NextResponse.json({ error: 'No track name specified' }, { status: 400 });
        }

        // Map track names to filenames
        const musicMap: Record<string, string> = {
            'upbeat': 'upbeat.mp3',
            'lofi': 'lofi.mp3',
            'cinematic': 'cinematic.mp3',
            'modern': 'modern.mp3',
            'piano': 'piano.mp3',
            'groove': 'groove.mp3'
        };

        const fileName = musicMap[trackName];
        if (!fileName) {
            return NextResponse.json({ error: 'Invalid track name' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadDir = path.join(process.cwd(), 'public', 'music');

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);

        // Add a query param to bust cache
        const publicUrl = `/music/${fileName}?t=${Date.now()}`;

        return NextResponse.json({ success: true, url: publicUrl });

    } catch (error) {
        console.error('Music upload failed:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
