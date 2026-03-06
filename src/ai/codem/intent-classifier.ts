'use server';

/**
 * Classifies user message as simple (single-file / Q&A) vs project (multi-file generation).
 */

import { litellmChatCompletion } from '@/ai/litellm-client';
import type { IntentResult } from './types';

const SYSTEM_PROMPT = `You are an intent classifier for a coding assistant. Given the user's message and optional conversation history, output a JSON object with:
- "type": either "simple" or "project"
- "features": array of short feature keywords (e.g. ["auth", "dashboard", "charts"])
- "complexity": "low", "medium", or "high"

Use "simple" for: code questions, single-file generation, debugging, explanations, "how do I", "write a function", "fix this code".
Use "project" for: "build me", "create a", "make an app", "full project", multi-component or multi-file requests.

Output ONLY valid JSON, no other text.`;

export async function classifyIntent(
  message: string,
  history?: { sender: string; text: string }[]
): Promise<IntentResult> {
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
    const type = parsed.type === 'project' ? 'project' : 'simple';
    const features = Array.isArray(parsed.features)
      ? (parsed.features as string[])
      : [];
    const complexity =
      parsed.complexity === 'low' || parsed.complexity === 'medium' || parsed.complexity === 'high'
        ? parsed.complexity
        : 'medium';
    return { type, features, complexity };
  } catch {
    return { type: 'simple', features: [], complexity: 'medium' };
  }
}
