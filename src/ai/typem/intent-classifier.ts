'use server';

/**
 * Classifies user message as simple (short text) vs document (multi-section) vs research (document + context).
 */

import { litellmChatCompletion } from '@/ai/litellm-client';
import type { WritingIntent } from './types';

const SYSTEM_PROMPT = `You are an intent classifier for a writing assistant. Given the user's message and optional conversation history, output a JSON object with:
- "type": "simple", "document", or "research"
- "documentType": string (e.g. "email", "essay", "proposal", "report", "research paper", "letter") — only when type is document or research
- "tone": string (e.g. "formal", "professional", "friendly", "academic") — optional
- "audience": string (e.g. "client", "employer", "general reader") — optional

Use "simple" for: short requests like a quick email, a paragraph, a single reply, "write me a few sentences", "draft a short message".
Use "document" for: multi-section or structured writing — essays, reports, proposals, applications, letters, documentation with sections.
Use "research" for: research papers, literature reviews, or any document that should use retrieved references/notes as context.

Output ONLY valid JSON, no other text.`;

export async function classifyWritingIntent(
  message: string,
  history?: { sender: string; text: string }[]
): Promise<WritingIntent> {
  const historyBlob = history?.length
    ? history.slice(-6).map((h) => `${h.sender}: ${h.text}`).join('\n')
    : '';

  const userContent = historyBlob
    ? `Recent context:\n${historyBlob}\n\nUser message to classify:\n${message}`
    : message;

  const content = await litellmChatCompletion({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    modelEnvKey: 'LITELLM_PLANNER_MODEL',
    defaultModel: 'gpt-oss-120b',
    maxTokens: 256,
    temperature: 0.2,
  });

  const trimmed = content.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const type =
      parsed.type === 'document' || parsed.type === 'research'
        ? parsed.type
        : 'simple';
    const documentType =
      typeof parsed.documentType === 'string' ? parsed.documentType : undefined;
    const tone = typeof parsed.tone === 'string' ? parsed.tone : undefined;
    const audience =
      typeof parsed.audience === 'string' ? parsed.audience : undefined;
    return { type, documentType, tone, audience };
  } catch {
    return { type: 'simple' };
  }
}
