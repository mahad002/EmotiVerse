'use server';

/**
 * Type M orchestrator: intent → outline → expand sections → review → assemble.
 * Simple path: single LLM call. Document path: outline → section loop (expand, review, embed) → full doc.
 */

import { litellmChatCompletion } from '@/ai/litellm-client';
import { typeMPersona } from '@/config/personas';
import * as vectorStore from '@/ai/codem/vector-store';
import { classifyWritingIntent } from './intent-classifier';
import { createDocumentPlan } from './outliner-agent';
import { expandSection } from './expander-agent';
import { reviewSection } from './reviewer-agent';
import { runCoherencePass } from './coherence-agent';
import type {
  AgentInput,
  AgentOutput,
  ProgressEvent,
  DocumentPlan,
  DocumentSection,
  WritingIntent,
} from './types';

const TYPEM_STORE_PREFIX = 'typem-';
const MAX_REVIEW_ATTEMPTS = 2;

function getStoreSessionId(sessionId: string): string {
  return TYPEM_STORE_PREFIX + sessionId;
}

/**
 * Simple path: one LLM call, return plain text.
 */
async function runSimplePath(
  input: AgentInput,
  _intent: WritingIntent
): Promise<AgentOutput> {
  const model =
    process.env.LITELLM_CHAT_MODEL || 'codestral-22b';
  const content = await litellmChatCompletion({
    messages: [
      { role: 'system', content: typeMPersona.systemPrompt },
      { role: 'user', content: input.message },
    ],
    model,
    maxTokens: 2048,
    temperature: 0.4,
  });
  return {
    type: 'simple',
    response: content.trim(),
  };
}

export async function runTypeMAgent(
  input: AgentInput,
  onProgress?: (event: ProgressEvent) => void
): Promise<AgentOutput> {
  const { message, history, sessionId } = input;
  const storeKey = getStoreSessionId(sessionId);

  try {
    onProgress?.({ stage: 'classifying' });
    const intent = await classifyWritingIntent(message, history);

    if (intent.type === 'simple') {
      onProgress?.({ stage: 'complete' });
      return runSimplePath(input, intent);
    }

    onProgress?.({ stage: 'outlining', detail: 'Creating outline...' });
    const plan = await createDocumentPlan(message, intent);
    onProgress?.({ stage: 'outline_ready', plan });

    const sections: DocumentSection[] = [];
    const completed = new Set<string>();

    for (let i = 0; i < plan.sections.length; i++) {
      const outlineSection = plan.sections[i];
      onProgress?.({
        stage: 'expanding',
        sectionId: outlineSection.id,
        sectionIndex: i,
        totalSections: plan.sections.length,
      });

      let content = '';
      let attempt = 0;
      let fixPrompt: string | undefined;

      while (attempt <= MAX_REVIEW_ATTEMPTS) {
        if (attempt > 0) {
          onProgress?.({ stage: 'fixing', sectionId: outlineSection.id, attempt });
        }

        const contextResults = await vectorStore.search(
          storeKey,
          outlineSection.description,
          5
        );
        const contextBlob = contextResults.length
          ? contextResults.map((r) => `--- ${r.path} ---\n${r.content}`).join('\n\n')
          : '';

        const previousSectionContent = i > 0 ? sections[i - 1].content : undefined;
        const nextSectionTitle = i < plan.sections.length - 1 ? plan.sections[i + 1].title : undefined;

        content = await expandSection(
          outlineSection,
          plan,
          contextBlob,
          fixPrompt,
          previousSectionContent,
          nextSectionTitle
        );

        onProgress?.({ stage: 'reviewing', sectionId: outlineSection.id });
        const review = await reviewSection({
          id: outlineSection.id,
          title: outlineSection.title,
          description: outlineSection.description,
          content,
        });

        if (review.passed || review.severity === 'warning') break;
        fixPrompt = review.issues.join('\n');
        attempt++;
      }

      const section: DocumentSection = {
        id: outlineSection.id,
        title: outlineSection.title,
        description: outlineSection.description,
        content,
      };
      sections.push(section);

      try {
        await vectorStore.addDocument(
          storeKey,
          content,
          outlineSection.id,
          { title: outlineSection.title }
        );
      } catch (embedErr) {
        console.warn(`Type M embed/store skipped for ${outlineSection.id}:`, embedErr);
      }

      onProgress?.({ stage: 'section_generated', sections: [section] });
    }

    let fullDocument = sections
      .map((s) => `## ${s.title}\n\n${s.content}`)
      .join('\n\n---\n\n');

    let finalSections = sections;

    try {
      onProgress?.({ stage: 'coherence' });
      const revised = await runCoherencePass(fullDocument, plan.title);
      if (revised && revised.trim().length > 0) {
        fullDocument = revised.trim();
        const parts = fullDocument.split(/\n##\s+/);
        if (parts.length >= 1 && parts.length - 1 === plan.sections.length) {
          const rebuilt: DocumentSection[] = [];
          for (let idx = 0; idx < plan.sections.length; idx++) {
            const segment = parts[idx + 1] ?? '';
            const firstNewline = segment.indexOf('\n\n');
            const title = firstNewline >= 0 ? segment.slice(0, firstNewline).trim() : segment.trim();
            let content = firstNewline >= 0 ? segment.slice(firstNewline + 2) : '';
            content = content.replace(/\n\n---\n\n$/, '').trim();
            rebuilt.push({
              id: plan.sections[idx].id,
              title: title || plan.sections[idx].title,
              description: plan.sections[idx].description,
              content,
            });
          }
          finalSections = rebuilt;
        }
      }
    } catch {
      // Keep original fullDocument and sections
    }

    onProgress?.({ stage: 'complete' });
    return {
      type: 'document',
      response: `Generated document "${plan.title}" with ${finalSections.length} section(s).`,
      fullDocument,
      sections: finalSections,
      plan,
    };
  } catch (err) {
    console.error('Type M agent error:', err);
    return runSimplePath(input, { type: 'simple' });
  }
}
