'use server';

/**
 * Skeleton agent: produces a file outline with checkpoints for long single-file generation.
 * Used only for simple-plan long-file flow; not used in project (multi-file) flow.
 */

import { litellmChatCompletion } from '@/ai/litellm-client';
import { getModelForTask } from './model-router';
import * as vectorStore from './vector-store';
import type { CheckpointSpec, SkeletonResult } from './types';
import { PLACEHOLDER_PREFIX, PLACEHOLDER_SUFFIX } from './constants';

function extractJson(content: string): string {
  const trimmed = content.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}') + 1;
  if (start >= 0 && end > start) return trimmed.slice(start, end);
  return trimmed;
}

/**
 * Generate a skeleton with checkpoints for a long single file.
 * Stores the skeleton in the vector store under `${filePath}:skeleton`.
 */
export async function generateSkeleton(
  taskDescription: string,
  filePath: string,
  language: string,
  sessionId: string
): Promise<SkeletonResult> {
  const model = getModelForTask('planning');
  const systemPrompt = `You are Code M. Given a task and target file, output a JSON object that defines a skeleton of the file with insertion checkpoints.

Output ONLY valid JSON in this exact shape:
{
  "checkpoints": [
    { "id": "cp1", "insertAfter": "description of where (e.g. after head, inside main)", "name": "section or function name", "purpose": "one line what this part does", "signature": "optional function signature or export" },
    ...
  ],
  "skeletonText": "The file structure as text with placeholders. Use exactly the string ___CHECKPOINT_cp1___ where checkpoint cp1 content should go, ___CHECKPOINT_cp2___ for cp2, etc. Include minimal structure (e.g. opening tags, section headers) but leave checkpoint placeholders for the actual content."
}

Rules:
- Use 3-8 checkpoints for a long file (sections, functions, or logical blocks).
- skeletonText must be valid ${language} structure with ___CHECKPOINT_<id>___ placeholders.
- Each checkpoint id must appear exactly once in skeletonText.
- Keep skeletonText concise; the real content will be generated per checkpoint.`;

  const userPrompt = `Task: ${taskDescription}\nTarget file: ${filePath}\nLanguage: ${language}\n\nOutput the JSON object with checkpoints and skeletonText.`;

  const content = await litellmChatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model,
    maxTokens: 2048,
    temperature: 0.2,
  });

  const jsonStr = extractJson(content);
  let parsed: { checkpoints?: unknown[]; skeletonText?: string };
  try {
    parsed = JSON.parse(jsonStr) as { checkpoints?: unknown[]; skeletonText?: string };
  } catch {
    parsed = { checkpoints: [], skeletonText: `// ___CHECKPOINT_cp1___\n` };
  }

  const checkpoints: CheckpointSpec[] = Array.isArray(parsed.checkpoints)
    ? (parsed.checkpoints as CheckpointSpec[]).filter((c) => c && typeof c.id === 'string')
    : [];
  const skeletonText =
    typeof parsed.skeletonText === 'string' && parsed.skeletonText.length > 0
      ? parsed.skeletonText
      : checkpoints
          .map((c) => `${PLACEHOLDER_PREFIX}${c.id}${PLACEHOLDER_SUFFIX}`)
          .join('\n\n');

  const result: SkeletonResult = {
    filePath,
    language,
    checkpoints,
    skeletonText,
  };

  const skeletonDoc = JSON.stringify({
    filePath: result.filePath,
    language: result.language,
    checkpoints: result.checkpoints,
    skeletonText: result.skeletonText,
  });
  const storePath = `${filePath}:skeleton`;
  await vectorStore.addDocument(sessionId, skeletonDoc, storePath, {
    filePath,
    checkpointIds: result.checkpoints.map((c) => c.id),
  });

  return result;
}
