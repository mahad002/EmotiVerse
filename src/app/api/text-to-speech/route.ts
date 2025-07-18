import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech, type TextToSpeechInput } from '@/ai/flows/text-to-speech';

export async function POST(request: NextRequest) {
  try {
    const body: TextToSpeechInput = await request.json();
    const result = await textToSpeech(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Text-to-speech API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}