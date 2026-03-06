'use server';

/**
 * Executor agent: retrieves context from vector store, calls Codestral, returns generated file(s).
 */

import { litellmChatCompletion } from '@/ai/litellm-client';
import { getModelForTask } from './model-router';
import * as vectorStore from './vector-store';
import type { Plan, TaskDefinition, GeneratedFile, SimplePlan, ProjectPlan } from './types';

function extractCodeBlock(content: string): { code: string; language?: string } {
  const fenceMatch = content.match(/```(\w*)\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    return { code: fenceMatch[2].trim(), language: fenceMatch[1] || undefined };
  }
  return { code: content.trim(), language: undefined };
}

function inferLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    py: 'python', css: 'css', html: 'html', json: 'json', md: 'markdown',
  };
  return map[ext] ?? ext;
}

export async function executeTask(
  task: TaskDefinition,
  plan: Plan,
  sessionId: string,
  fixPrompt?: string
): Promise<GeneratedFile[]> {
  let contextBlob = '';
  try {
    const contextResults = await vectorStore.search(sessionId, task.description, 5);
    contextBlob = contextResults.length
      ? contextResults.map((r) => `--- ${r.path} ---\n${r.content}`).join('\n\n')
      : '';
  } catch (searchErr) {
    console.warn('Code M vector search skipped (embedding may be unavailable):', searchErr);
  }

  const archSummary =
    plan.type === 'project'
      ? `Project: ${plan.architecture.projectType}. Structure: ${plan.architecture.structure.map((n) => n.path).join(', ')}.`
      : plan.type === 'simple'
        ? (plan as SimplePlan).description
        : '';

  const systemPrompt = `You are Code M, a technical software engineering assistant. You implement files inside an existing project.
Architecture / context:
${archSummary}

${contextBlob ? `Relevant existing files:\n${contextBlob}` : ''}

${fixPrompt ? `Fix the following issues:\n${fixPrompt}\n\n` : ''}

Output the requested file content. Use a single markdown fenced code block with the correct language (e.g. \`\`\`tsx, \`\`\`js). Put the file path as a comment on the first line if needed (e.g. // src/pages/Dashboard.jsx).
Output ONLY the code block(s), minimal prose.`;

  const userPrompt = fixPrompt
    ? `Re-implement the file addressing the issues above. Target: ${task.targetFiles.join(', ')}.`
    : `Implement this task: ${task.description}\nTarget file(s): ${task.targetFiles.join(', ')}`;

  const model = getModelForTask('code_generation');
  const content = await litellmChatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model,
    maxTokens: 2048,
    temperature: 0.3,
  });

  const files: GeneratedFile[] = [];
  const blockRegex = /```(\w*)\s*\n?([\s\S]*?)```/g;
  let match = blockRegex.exec(content);
  if (match) {
    do {
      const language = match[1] || undefined;
      const code = match[2].trim();
      const targetPath = task.targetFiles[files.length] ?? task.targetFiles[0] ?? `file-${files.length}.ts`;
      files.push({
        path: targetPath,
        content: code,
        language: language || inferLanguage(targetPath),
      });
    } while ((match = blockRegex.exec(content)) !== null);
  }

  if (files.length === 0) {
    const { code, language } = extractCodeBlock(content);
    const path = task.targetFiles[0] ?? 'output.ts';
    const body = (code ?? content?.trim()) || '';
    files.push({
      path,
      content: body || `// No content for ${task.description}`,
      language: language || inferLanguage(path),
    });
  }

  for (const file of files) {
    try {
      await vectorStore.addDocument(sessionId, file.content, file.path);
    } catch (embedErr) {
      console.warn(`Code M embed/store skipped for ${file.path}:`, embedErr);
    }
  }

  return files;
}

/**
 * Execute simple plan: one task with a single output (prose + optional code segments).
 */
export async function executeSimplePlan(
  plan: SimplePlan,
  sessionId: string
): Promise<{ response: string; files: GeneratedFile[] }> {
  const task: TaskDefinition = {
    id: 'simple-1',
    description: plan.description,
    targetFiles: plan.singleFileHint ? [plan.singleFileHint.path] : ['output.ts'],
    dependsOn: [],
    contextFiles: [],
  };
  const files = await executeTask(task, plan, sessionId);
  const response = files.length
    ? `Here's the implementation for: ${plan.description}`
    : plan.description;
  return { response, files };
}
