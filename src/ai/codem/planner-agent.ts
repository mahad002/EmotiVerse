'use server';

/**
 * Planner agent: generates SimplePlan (single task) or ProjectPlan (architecture + task list).
 */

import { litellmChatCompletion } from '@/ai/litellm-client';
import type { Plan, SimplePlan, ProjectPlan, IntentResult } from './types';

const SIMPLE_SYSTEM = `You are a technical planning assistant. Given the user's request (classified as "simple"), output a JSON object:
{
  "type": "simple",
  "description": "clear one-sentence description of what to generate",
  "singleFileHint": { "path": "e.g. src/utils/helper.ts", "language": "ts" }
}
Output ONLY valid JSON. singleFileHint is optional.`;

const PROJECT_SYSTEM = `You are an software architect. Given the user's request (classified as "project"), output a JSON object with this exact structure:
{
  "type": "project",
  "architecture": {
    "projectType": "string (e.g. react-web-app)",
    "structure": [ { "path": "relative/file/path", "description": "brief purpose" } ],
    "dependencies": ["package names"],
    "frameworks": ["React", "Node", etc.]
  },
  "tasks": [
    {
      "id": "task-1",
      "description": "what to do",
      "targetFiles": ["path/to/file.js"],
      "dependsOn": [],
      "contextFiles": []
    }
  ]
}
- Order tasks so dependencies come first (dependsOn lists task ids that must complete before this one).
- Each task produces one or more files. contextFiles are paths of files to use as context when generating.
- Output ONLY valid JSON.`;

function extractJson(content: string): string {
  const trimmed = content.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}') + 1;
  if (start >= 0 && end > start) return trimmed.slice(start, end);
  return trimmed;
}

export async function planSimple(
  message: string,
  _intent: IntentResult,
  history?: { sender: string; text: string }[]
): Promise<SimplePlan> {
  const userContent =
    history?.length &&
    (history.some((h) => h.sender !== 'user') || history.length > 1)
      ? `Recent context:\n${history.slice(-6).map((h) => `${h.sender}: ${h.text.slice(0, 500)}${h.text.length > 500 ? '...' : ''}`).join('\n')}\n\nUser message to plan for:\n${message}`
      : message;
  const content = await litellmChatCompletion({
    messages: [
      { role: 'system', content: SIMPLE_SYSTEM },
      { role: 'user', content: userContent },
    ],
    modelEnvKey: 'LITELLM_PLANNER_MODEL',
    defaultModel: 'gpt-oss-120b',
    maxTokens: 512,
    temperature: 0.3,
  });

  try {
    const parsed = JSON.parse(extractJson(content)) as Record<string, unknown>;
    if (parsed.type === 'simple') {
      return {
        type: 'simple',
        description: typeof parsed.description === 'string' ? parsed.description : message,
        singleFileHint:
          parsed.singleFileHint && typeof (parsed.singleFileHint as { path?: string; language?: string }).path === 'string'
            ? {
                path: (parsed.singleFileHint as { path: string }).path,
                language: (parsed.singleFileHint as { language?: string }).language ?? 'ts',
              }
            : undefined,
      };
    }
  } catch {
    // fallback
  }
  return { type: 'simple', description: message };
}

export async function planProject(
  message: string,
  intent: IntentResult,
  history?: { sender: string; text: string }[]
): Promise<ProjectPlan> {
  const contextBlob =
    history?.length &&
    history.some((h) => h.sender !== 'user')
      ? `Recent context:\n${history.slice(-4).map((h) => `${h.sender}: ${h.text.slice(0, 300)}${h.text.length > 300 ? '...' : ''}`).join('\n')}\n\n`
      : '';
  const content = await litellmChatCompletion({
    messages: [
      { role: 'system', content: PROJECT_SYSTEM },
      { role: 'user', content: `${contextBlob}User request: ${message}\nFeatures: ${intent.features.join(', ')}` },
    ],
    modelEnvKey: 'LITELLM_PLANNER_MODEL',
    defaultModel: 'gpt-oss-120b',
    maxTokens: 2048,
    temperature: 0.3,
  });

  try {
    const parsed = JSON.parse(extractJson(content)) as Record<string, unknown>;
    if (parsed.type === 'project' && parsed.architecture && Array.isArray(parsed.tasks)) {
      const arch = parsed.architecture as Record<string, unknown>;
      return {
        type: 'project',
        architecture: {
          projectType: typeof arch.projectType === 'string' ? arch.projectType : 'web-app',
          structure: Array.isArray(arch.structure)
            ? (arch.structure as { path: string; description?: string }[]).map((n) => ({
                path: typeof n.path === 'string' ? n.path : String(n),
                description: typeof (n as { description?: string }).description === 'string' ? (n as { description: string }).description : undefined,
              }))
            : [],
          dependencies: Array.isArray(arch.dependencies) ? (arch.dependencies as string[]) : [],
          frameworks: Array.isArray(arch.frameworks) ? (arch.frameworks as string[]) : [],
        },
        tasks: (parsed.tasks as Record<string, unknown>[]).map((t, i) => ({
          id: typeof t.id === 'string' ? t.id : `task-${i + 1}`,
          description: typeof t.description === 'string' ? t.description : '',
          targetFiles: Array.isArray(t.targetFiles) ? (t.targetFiles as string[]) : [],
          dependsOn: Array.isArray(t.dependsOn) ? (t.dependsOn as string[]) : [],
          contextFiles: Array.isArray(t.contextFiles) ? (t.contextFiles as string[]) : [],
        })),
      };
    }
  } catch {
    // fallback minimal project
  }
  return {
    type: 'project',
    architecture: {
      projectType: 'web-app',
      structure: [],
      dependencies: [],
      frameworks: [],
    },
    tasks: [{ id: 'task-1', description: message, targetFiles: [], dependsOn: [], contextFiles: [] }],
  };
}

export async function createPlan(
  message: string,
  intent: IntentResult,
  history?: { sender: string; text: string }[]
): Promise<Plan> {
  if (intent.type === 'simple') return planSimple(message, intent, history);
  return planProject(message, intent, history);
}
