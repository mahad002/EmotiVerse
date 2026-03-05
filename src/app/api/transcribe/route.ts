import { NextRequest, NextResponse } from 'next/server';
import { litellmTranscribe } from '@/ai/litellm-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { audioBase64, filename = 'audio.webm' } = body as { audioBase64?: string; filename?: string };
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return NextResponse.json({ error: 'audioBase64 (string) is required' }, { status: 400 });
    }
    const raw = Buffer.from(audioBase64.replace(/\s/g, ''), 'base64');
    if (raw.length === 0) {
      return NextResponse.json({ error: 'Audio data is empty' }, { status: 400 });
    }
    const text = await litellmTranscribe({ audioBuffer: raw, filename });
    return NextResponse.json({ text: text || '' });
  } catch (error) {
    console.error('Transcribe API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
