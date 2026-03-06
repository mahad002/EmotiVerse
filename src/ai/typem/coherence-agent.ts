'use server';

/**
 * Full-document coherence pass: one LLM call to improve consistency, transitions, and repetition.
 * Preserves section headers (## Title) and returns the revised document text only.
 */

import { litellmChatCompletion } from '@/ai/litellm-client';

const COHERENCE_MODEL_ENV = 'LITELLM_PLANNER_MODEL';
const FALLBACK_MODEL_ENV = 'LITELLM_VALIDATOR_MODEL';
const DEFAULT_MODEL = 'llama-3.3-70b-instruct';
const MAX_INPUT_CHARS = 12_000;

export async function runCoherencePass(
  fullDocument: string,
  documentTitle: string
): Promise<string> {
  const model =
    process.env[COHERENCE_MODEL_ENV] ||
    process.env[FALLBACK_MODEL_ENV] ||
    process.env.LITELLM_CHAT_MODEL ||
    DEFAULT_MODEL;

  const input =
    fullDocument.length > MAX_INPUT_CHARS
      ? fullDocument.slice(0, MAX_INPUT_CHARS) + '\n\n[... document truncated for context ...]'
      : fullDocument;

  const systemPrompt = `You are an editor. Review the following document for:
- Repeated phrases or redundant wording (reduce repetition)
- Tone consistency across sections
- Smooth transition flow between sections

Preserve section headers exactly as written (lines starting with ## Section Title). Only edit body text.
Output ONLY the revised full document text. No commentary, no explanation.`;

  const userContent = `Document title: ${documentTitle}\n\n${input}`;

  const content = await litellmChatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    model,
    maxTokens: 8192,
    temperature: 0.2,
  });

  return content.trim();
}
