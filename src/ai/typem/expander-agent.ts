'use server';

/**
 * Section expander: turns one outline section into full prose using gemma-3-27b.
 */

import { litellmChatCompletion } from '@/ai/litellm-client';
import type { DocumentPlan, OutlineSection } from './types';

const EXPANDER_MODEL_ENV = 'LITELLM_VALIDATOR_MODEL';
const EXPANDER_DEFAULT = 'gemma-3-27b-it';

export async function expandSection(
  section: OutlineSection,
  plan: DocumentPlan,
  contextBlob: string,
  fixPrompt?: string
): Promise<string> {
  const model =
    process.env[EXPANDER_MODEL_ENV] ||
    process.env.LITELLM_CHAT_MODEL ||
    EXPANDER_DEFAULT;

  const systemPrompt = `You are Type M, a writing assistant. Expand the given section into full, well-written prose.
Document title: ${plan.title}
Section: ${section.title}
Section description: ${section.description}

${contextBlob ? `Relevant context from other sections or notes:\n${contextBlob}` : ''}
${fixPrompt ? `Revise to address these issues:\n${fixPrompt}\n\n` : ''}

Output ONLY the section content as prose. No markdown headers, no "Section X" labels — just the paragraph(s) for this section. Use clear, coherent prose.`;

  const userPrompt = fixPrompt
    ? `Re-write the section "${section.title}" addressing the feedback above.`
    : `Write the content for this section: ${section.title}. ${section.description}`;

  const content = await litellmChatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model,
    maxTokens: 2048,
    temperature: 0.4,
  });

  return content.trim();
}
