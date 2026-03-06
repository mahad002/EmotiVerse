import { NextRequest, NextResponse } from 'next/server';
import { runTypeMAgent } from '@/ai/typem/orchestrator';
import type { ProgressEvent, AgentOutput } from '@/ai/typem/types';
import { getDecodedIdToken } from '@/lib/firebase-admin';
import { appendActivityLog } from '@/lib/activity-log';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message : '';
    const history = Array.isArray(body.history) ? body.history : [];
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : `session-${Date.now()}`;

    if (!message.trim()) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    const decoded = await getDecodedIdToken(request);
    const characterId = sessionId.replace(/^typem-/, '') || sessionId;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: ProgressEvent | { type: 'result'; output: AgentOutput }) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const output = await runTypeMAgent(
            { message: message.trim(), history, sessionId },
            (event) => send(event)
          );
          send({ type: 'result', output });
          if (decoded) {
            const historyMessages = history.map((h: { sender?: string; text?: string }) => ({
              role: (h.sender === 'user' ? 'user' : 'ai') as 'user' | 'ai',
              text: typeof h.text === 'string' ? h.text : '',
            }));
            const aiText =
              typeof output.response === 'string'
                ? output.response
                : output.type === 'document' && output.sections?.length
                  ? output.sections.map((s: { content?: string }) => s.content ?? '').join('\n\n')
                  : '';
            void appendActivityLog({
              uid: decoded.uid,
              email: decoded.email,
              characterId,
              messages: [
                ...historyMessages,
                { role: 'user', text: message.trim() },
                { role: 'ai', text: aiText },
              ],
              source: 'typem',
              sessionId,
            });
          }
        } catch (err) {
          console.error('Type M agent route error:', err);
          send({
            type: 'result',
            output: {
              type: 'simple',
              response: 'Something went wrong. Please try again.',
            },
          });
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('EmotiVerse Type M agent API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
