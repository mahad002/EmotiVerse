import { NextRequest, NextResponse } from 'next/server';
import { emotionalConversation, type EmotionalConversationInput } from '@/ai/flows/emotional-conversation';
import { getDecodedIdToken } from '@/lib/firebase-admin';
import { appendActivityLog } from '@/lib/activity-log';

export async function POST(request: NextRequest) {
  try {
    const body: EmotionalConversationInput = await request.json();
    const result = await emotionalConversation(body);
    const decoded = await getDecodedIdToken(request);
    if (decoded) {
      const historyMessages = (body.history ?? []).map((m) => ({
        role: (m.sender === 'user' ? 'user' : 'ai') as 'user' | 'ai',
        text: m.text,
      }));
      void appendActivityLog({
        uid: decoded.uid,
        email: decoded.email,
        characterId: body.characterId,
        persona: body.persona,
        messages: [
          ...historyMessages,
          { role: 'user', text: body.message },
          { role: 'ai', text: (result.response ?? []).join(' ') },
        ],
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Emotional conversation API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}