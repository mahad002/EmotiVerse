import { NextRequest, NextResponse } from 'next/server';
import { runCodeMAgent } from '@/ai/codem/orchestrator';
import type { ProgressEvent, AgentOutput } from '@/ai/codem/types';

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

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: ProgressEvent | { type: 'result'; output: AgentOutput }) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const output = await runCodeMAgent(
            { message: message.trim(), history, sessionId },
            (event) => send(event)
          );
          send({ type: 'result', output });
        } catch (err) {
          console.error('Code M agent route error:', err);
          send({
            type: 'result',
            output: {
              type: 'simple',
              response: 'Something went wrong. Please try again.',
              segments: [{ type: 'text', text: 'Something went wrong. Please try again.' }],
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
    console.error('EmotiVerse Code M agent API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
