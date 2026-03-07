'use server';

/**
 * Outliner agent: produces DocumentPlan (title + sections with descriptions) using llama-3.3-70b-instruct.
 */

import { litellmChatCompletion } from '@/ai/litellm-client';
import type { DocumentPlan, OutlineSection, WritingIntent } from './types';

const OUTLINER_MODEL_ENV = 'LITELLM_PLANNER_MODEL';
const OUTLINER_DEFAULT = 'llama-3.3-70b-instruct';

const SYSTEM_PROMPT = `You are a writing assistant. Given the user's request and optional document type, tone, and audience, output a JSON object with:
- "title": string — document title
- "sections": array of objects, each with:
  - "id": string, unique (e.g. "section-1", "section-2")
  - "title": string — section heading
  - "description": string — one or two sentences describing what this section should cover

Create enough sections to fully address the request. Typical documents: 3–8 sections. Order sections logically (intro → body → conclusion where applicable).
Output ONLY valid JSON, no other text.`;

function extractJson(content: string): string {
  const trimmed = content.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}') + 1;
  if (start >= 0 && end > start) return trimmed.slice(start, end);
  return trimmed;
}

export async function createDocumentPlan(
  message: string,
  intent: WritingIntent
): Promise<DocumentPlan> {
  const model =
    process.env[OUTLINER_MODEL_ENV] ||
    process.env.LITELLM_PLANNER_MODEL ||
    OUTLINER_DEFAULT;

  const meta: string[] = [];
  if (intent.documentType) meta.push(`Document type: ${intent.documentType}`);
  if (intent.tone) meta.push(`Tone: ${intent.tone}`);
  if (intent.audience) meta.push(`Audience: ${intent.audience}`);
  const metaBlob = meta.length > 0 ? meta.join('\n') + '\n\n' : '';

  const content = await litellmChatCompletion({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `${metaBlob}User request: ${message}` },
    ],
    model,
    maxTokens: 1024,
    temperature: 0.3,
  });

  try {
    const parsed = JSON.parse(extractJson(content)) as Record<string, unknown>;
    const title =
      typeof parsed.title === 'string' ? parsed.title : 'Document';
    const rawSections = Array.isArray(parsed.sections) ? parsed.sections : [];
    const sections: OutlineSection[] = rawSections
      .filter((s): s is Record<string, unknown> => s && typeof s === 'object')
      .map((s, i) => ({
        id: typeof s.id === 'string' ? s.id : `section-${i + 1}`,
        title: typeof s.title === 'string' ? s.title : `Section ${i + 1}`,
        description:
          typeof s.description === 'string' ? s.description : '',
      }));

    if (sections.length === 0) {
      sections.push({
        id: 'section-1',
        title: 'Main content',
        description: 'Address the user request.',
      });
    }

    return { title, sections };
  } catch {
    return {
      title: 'Document',
      sections: [
        { id: 'section-1', title: 'Main content', description: message },
      ],
    };
  }
}
