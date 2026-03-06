'use server';

/**
 * Review agent: checks section for grammar, clarity, and tone. Returns pass/fail and issues.
 */

import { litellmChatCompletion } from '@/ai/litellm-client';
import type { DocumentSection, ReviewResult } from './types';

const REVIEWER_MODEL_ENV = 'LITELLM_PLANNER_MODEL';
const REVIEWER_DEFAULT = 'llama-3.3-70b-instruct';

export async function reviewSection(
  section: DocumentSection
): Promise<ReviewResult> {
  const model =
    process.env[REVIEWER_MODEL_ENV] ||
    process.env.LITELLM_VALIDATOR_MODEL ||
    REVIEWER_DEFAULT;

  const systemPrompt = `You are a writing editor. Review the following section for grammar, clarity, and appropriate tone.
Output a JSON object only:
{
  "passed": true or false,
  "issues": ["list of specific issues, or empty if passed"],
  "severity": "error" or "warning"
}
Use "error" for grammar mistakes, unclear sentences, or tone that doesn't fit. Use "warning" for minor style suggestions.
If the text is clear, grammatically correct, and well-written, set "passed": true and "issues": [].
Output ONLY valid JSON.`;

  const userContent = `Section: ${section.title}\n\n${section.content.slice(0, 4000)}`;

  const content = await litellmChatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    model,
    maxTokens: 512,
    temperature: 0.2,
  });

  const trimmed = content.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}') + 1;
  const jsonStr = start >= 0 && end > start ? trimmed.slice(start, end) : trimmed;

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    return {
      passed: parsed.passed === true,
      issues: Array.isArray(parsed.issues) ? (parsed.issues as string[]) : [],
      severity: parsed.severity === 'warning' ? 'warning' : 'error',
    };
  } catch {
    return { passed: true, issues: [], severity: 'warning' };
  }
}
