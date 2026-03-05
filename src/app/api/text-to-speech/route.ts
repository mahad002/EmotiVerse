import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech, type TextToSpeechInput } from '@/ai/flows/text-to-speech';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input: TextToSpeechInput =
      typeof body === 'string' ? body : { text: body?.text ?? '', voice: body?.voice };
    const result = await textToSpeech(input);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Text-to-speech API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate speech';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}