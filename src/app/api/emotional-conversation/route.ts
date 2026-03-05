import { NextRequest, NextResponse } from 'next/server';
import { emotionalConversation, type EmotionalConversationInput } from '@/ai/flows/emotional-conversation';

export async function POST(request: NextRequest) {
  try {
    const body: EmotionalConversationInput = await request.json();
    const result = await emotionalConversation(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Emotional conversation API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process conversation';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}