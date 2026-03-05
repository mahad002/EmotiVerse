import { NextRequest, NextResponse } from 'next/server';
import { generateImage, type GenerateImageInput, type ImageQuality } from '@/ai/flows/generate-image';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, quality } = body as { prompt?: string; quality?: ImageQuality };
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'prompt (string) is required' },
        { status: 400 }
      );
    }
    const input: GenerateImageInput = { prompt, quality };
    const result = await generateImage(input);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Generate image API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
