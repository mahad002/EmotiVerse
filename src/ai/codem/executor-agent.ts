'use server';

/**
 * Executor agent: retrieves context from vector store, calls Codestral, returns generated file(s).
 */

import { litellmChatCompletion, litellmChatCompletionWithMeta } from '@/ai/litellm-client';
import { getModelForTask } from './model-router';
import * as vectorStore from './vector-store';
import type { Plan, TaskDefinition, GeneratedFile, SimplePlan, ProjectPlan, ExecuteTaskResult, SkeletonResult } from './types';
import { PLACEHOLDER_PREFIX, PLACEHOLDER_SUFFIX } from './constants';

function extractCodeBlock(content: string): { code: string; language?: string } {
  const fenceMatch = content.match(/```(\w*)\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    return { code: fenceMatch[2].trim(), language: fenceMatch[1] || undefined };
  }
  return { code: content.trim(), language: undefined };
}

function extractPathHint(code: string): { path?: string; code: string } {
  const lines = code.split(/\r?\n/);
  const firstLine = (lines[0] || '').trim();

  const pathMatch =
    firstLine.match(/^\/\/\s*([A-Za-z0-9._/-]+\.[A-Za-z0-9]+)\s*$/) ||
    firstLine.match(/^#\s*([A-Za-z0-9._/-]+\.[A-Za-z0-9]+)\s*$/) ||
    firstLine.match(/^<!--\s*([A-Za-z0-9._/-]+\.[A-Za-z0-9]+)\s*-->$/) ||
    firstLine.match(/^\/\*\s*([A-Za-z0-9._/-]+\.[A-Za-z0-9]+)\s*\*\/$/);

  if (!pathMatch) {
    return { code };
  }

  return {
    path: pathMatch[1],
    code: lines.slice(1).join('\n').trim(),
  };
}

function inferLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    py: 'python', css: 'css', html: 'html', json: 'json', md: 'markdown',
  };
  return map[ext] ?? ext;
}

const DEFAULT_CODE_MAX_TOKENS =
  (typeof process.env.LITELLM_CODE_MAX_TOKENS === 'string'
    ? parseInt(process.env.LITELLM_CODE_MAX_TOKENS, 10)
    : 0) || 2048;

/** Heuristic: content may be truncated if it ends with unclosed brackets/tags (no newline + closing). */
function looksTruncated(content: string, language?: string): boolean {
  const trimmed = content.trimEnd();
  if (!trimmed.length) return false;
  const lastLine = trimmed.split(/\r?\n/).pop() ?? '';
  if (language === 'html' || language === 'xml') {
    const open = (lastLine.match(/</g) ?? []).length;
    const close = (lastLine.match(/>/g) ?? []).length;
    if (lastLine.includes('<') && !lastLine.includes('>')) return true;
  }
  const openBraces = (lastLine.match(/[{(\[]/g) ?? []).length;
  const closeBraces = (lastLine.match(/[})\]]/g) ?? []).length;
  if (openBraces > closeBraces && lastLine.length > 20) return true;
  return false;
}

export async function executeTask(
  task: TaskDefinition,
  plan: Plan,
  sessionId: string,
  fixPrompt?: string,
  options?: { maxTokens?: number; history?: { sender: string; text: string }[] }
): Promise<ExecuteTaskResult> {
  let contextBlob = '';
  try {
    const contextResults = await vectorStore.search(sessionId, task.description, 5);
    contextBlob = contextResults.length
      ? contextResults.map((r) => `--- ${r.path} ---\n${r.content}`).join('\n\n')
      : '';
  } catch (searchErr) {
    console.warn('Code M vector search skipped (embedding may be unavailable):', searchErr);
  }

  const historyBlob =
    options?.history?.length &&
    options.history.some((h) => h.sender !== 'user')
      ? `Recent conversation (for context):\n${options.history.slice(-6).map((h) => `${h.sender}: ${h.text.slice(0, 600)}${h.text.length > 600 ? '...' : ''}`).join('\n')}\n\n`
      : '';

  const archSummary =
    plan.type === 'project'
      ? `Project: ${plan.architecture.projectType}. Structure: ${plan.architecture.structure.map((n) => n.path).join(', ')}.`
      : plan.type === 'simple'
        ? (plan as SimplePlan).description
        : '';

  const systemPrompt = `You are Code M, a technical software engineering assistant. You implement files inside an existing project.
Architecture / context:
${archSummary}

${historyBlob}${contextBlob ? `Relevant existing files:\n${contextBlob}` : ''}

${fixPrompt ? `Fix the following issues:\n${fixPrompt}\n\n` : ''}

Output the requested file content. Use a single markdown fenced code block with the correct language (e.g. \`\`\`tsx, \`\`\`js). Put the file path as a comment on the first line if needed (e.g. // src/pages/Dashboard.jsx).
Output ONLY the code block(s), minimal prose.`;

  const userPrompt = fixPrompt
    ? `Re-implement the file addressing the issues above. Target: ${task.targetFiles.join(', ')}.`
    : `Implement this task: ${task.description}\nTarget file(s): ${task.targetFiles.join(', ')}`;

  const model = getModelForTask('code_generation');
  const maxTokens = options?.maxTokens ?? DEFAULT_CODE_MAX_TOKENS;
  const isSimplePlan = plan.type === 'simple';

  let content: string;
  let finishReason: string | undefined;

  if (isSimplePlan) {
    const meta = await litellmChatCompletionWithMeta({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      maxTokens,
      temperature: 0.3,
    });
    content = meta.content;
    finishReason = meta.finishReason;
  } else {
    content = await litellmChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      maxTokens,
      temperature: 0.3,
    });
  }

  const files: GeneratedFile[] = [];
  const blockRegex = /```(\w*)\s*\n?([\s\S]*?)```/g;
  let match = blockRegex.exec(content);
  if (match) {
    do {
      const language = match[1] || undefined;
      const rawCode = match[2].trim();
      const { path: hintedPath, code } = extractPathHint(rawCode);
      const targetPath = hintedPath ?? task.targetFiles[files.length] ?? task.targetFiles[0] ?? `file-${files.length}.ts`;
      files.push({
        path: targetPath,
        content: code,
        language: language || inferLanguage(targetPath),
      });
    } while ((match = blockRegex.exec(content)) !== null);
  }

  if (files.length === 0) {
    const { code, language } = extractCodeBlock(content);
    const { path: hintedPath, code: strippedCode } = extractPathHint(code);
    const path = hintedPath ?? task.targetFiles[0] ?? 'output.ts';
    const body = (strippedCode ?? content?.trim()) || '';
    files.push({
      path,
      content: body || `// No content for ${task.description}`,
      language: language || inferLanguage(path),
    });
  }

  let incomplete = false;
  if (isSimplePlan && files.length > 0) {
    if (finishReason === 'length') incomplete = true;
    else if (!finishReason && files[0]) {
      if (looksTruncated(files[0].content, files[0].language)) incomplete = true;
    }
  }

  for (const file of files) {
    try {
      await vectorStore.addDocument(sessionId, file.content, file.path);
    } catch (embedErr) {
      console.warn(`Code M embed/store skipped for ${file.path}:`, embedErr);
    }
  }

  return { files, ...(incomplete && { incomplete: true }) };
}

/**
 * Execute long single-file via skeleton: generate one segment per checkpoint and merge.
 * Only used for simple-plan long-file flow; never used in project flow.
 */
export async function executeLongFileTask(
  skeleton: SkeletonResult,
  taskDescription: string,
  sessionId: string,
  onSegmentDone?: (index: number, total: number) => void
): Promise<ExecuteTaskResult> {
  const model = getModelForTask('code_generation');
  const maxTokens = DEFAULT_CODE_MAX_TOKENS;
  let merged = skeleton.skeletonText;

  for (let i = 0; i < skeleton.checkpoints.length; i++) {
    const cp = skeleton.checkpoints[i];
    onSegmentDone?.(i + 1, skeleton.checkpoints.length);

    let contextBlob = '';
    try {
      const results = await vectorStore.search(sessionId, `${skeleton.filePath} ${cp.id} ${taskDescription}`, 5);
      contextBlob = results.length
        ? results.map((r) => `--- ${r.path} ---\n${r.content.slice(0, 2000)}`).join('\n\n')
        : '';
    } catch {
      // non-fatal
    }

    const systemPrompt = `You are Code M. Generate ONLY the content for one checkpoint of a larger file. Do not repeat the surrounding structure or other checkpoints.

Skeleton (with placeholders): the file has structure with ___CHECKPOINT_<id>___ placeholders. You are filling checkpoint "${cp.id}".
${cp.purpose ? `Purpose: ${cp.purpose}` : ''}
${cp.name ? `Name/section: ${cp.name}` : ''}
${cp.signature ? `Signature: ${cp.signature}` : ''}

${contextBlob ? `Relevant context from same file or skeleton:\n${contextBlob}` : ''}

Output a single markdown fenced code block with language ${skeleton.language}. The block must contain ONLY the segment content for this checkpoint—no duplicate headers, no wrapping in extra tags.`;

    const userPrompt = `Generate the segment for checkpoint "${cp.id}" of file ${skeleton.filePath}. Task: ${taskDescription}. Output only the code for this segment in one fenced code block.`;

    const content = await litellmChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      maxTokens,
      temperature: 0.3,
    });

    const blockMatch = content.match(/```(?:\w*)\s*\n?([\s\S]*?)```/);
    const segmentCode = blockMatch ? blockMatch[1].trim() : content.trim();
    const placeholder = `${PLACEHOLDER_PREFIX}${cp.id}${PLACEHOLDER_SUFFIX}`;
    if (merged.includes(placeholder)) {
      merged = merged.replace(placeholder, segmentCode);
    }

    try {
      await vectorStore.addDocument(sessionId, segmentCode, `${skeleton.filePath}#${cp.id}`, {
        checkpointId: cp.id,
        filePath: skeleton.filePath,
      });
    } catch {
      // non-fatal
    }
  }

  const file: GeneratedFile = {
    path: skeleton.filePath,
    content: merged,
    language: skeleton.language,
  };
  try {
    await vectorStore.addDocument(sessionId, merged, skeleton.filePath);
  } catch (embedErr) {
    console.warn(`Code M embed/store skipped for ${skeleton.filePath}:`, embedErr);
  }

  return { files: [file] };
}

/**
 * Execute simple plan: one task with a single output (prose + optional code segments).
 * When incomplete is true, orchestrator may retry with higher maxTokens or run completion flow.
 */
export async function executeSimplePlan(
  plan: SimplePlan,
  sessionId: string,
  options?: { maxTokens?: number; history?: { sender: string; text: string }[] }
): Promise<{ response: string; files: GeneratedFile[]; incomplete?: boolean }> {
  const task: TaskDefinition = {
    id: 'simple-1',
    description: plan.description,
    targetFiles: plan.singleFileHint ? [plan.singleFileHint.path] : ['output.ts'],
    dependsOn: [],
    contextFiles: [],
  };
  const result = await executeTask(task, plan, sessionId, undefined, options);
  const response = result.files.length
    ? `Here's the implementation for: ${plan.description}`
    : plan.description;
  return { response, files: result.files, ...(result.incomplete && { incomplete: true }) };
}
