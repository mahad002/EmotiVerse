'use server';

/**
 * Architecture validator: uses a model to check if the project plan is complete and correct.
 * Catches missing files (e.g. App.jsx), wrong structure, and inconsistencies between
 * architecture.structure and task targetFiles.
 */

import { litellmChatCompletion } from '@/ai/litellm-client';
import { getModelForTask } from './model-router';
import type { ProjectPlan } from './types';

export interface ArchitectureValidationResult {
  passed: boolean;
  issues: string[];
}

const SYSTEM_PROMPT = `You are an architecture reviewer for a code generation system. Given a user request and a project plan (architecture + tasks), determine if the plan is complete and correct.

Check strictly:
1. **Completeness**: For the stated project type, are ALL required files present? For example:
   - A React web app typically needs: index.html (entry HTML), a root component (e.g. src/App.jsx or App.tsx), and often main.jsx/index.jsx or similar to mount the app. Do not allow a plan that has index.html but no App.jsx (or equivalent root component), or vice versa.
   - Every file in architecture.structure should be produced by some task (appear in at least one task's targetFiles).
2. **Consistency**: Do task targetFiles match the architecture structure? No file should be produced that is not in the structure; no structure file should be missing from all tasks' targetFiles.
3. **Correct assignment**: Are the right kinds of files assigned to the right tasks? (e.g. index.html for the HTML shell task, App.jsx for the root component task.)

Output ONLY a JSON object:
{
  "passed": true or false,
  "issues": ["list of specific issues. If passed, use empty array. Otherwise list e.g. 'Missing App.jsx (root component) in structure and tasks', 'index.html not in any task targetFiles'"]
}
Be strict: if any required file for the project type is missing or misplaced, set passed to false.`;

export async function validateArchitecture(
  plan: ProjectPlan,
  userMessage: string
): Promise<ArchitectureValidationResult> {
  const structureList = plan.architecture.structure
    .map((n) => `${n.path}${n.description ? ` (${n.description})` : ''}`)
    .join('\n');
  const tasksList = plan.tasks
    .map(
      (t) =>
        `Task ${t.id}: ${t.description}\n  targetFiles: [${t.targetFiles.join(', ')}]`
    )
    .join('\n');
  const userContent = `User request: ${userMessage}

Project type: ${plan.architecture.projectType}
Structure (required files):
${structureList}

Tasks:
${tasksList}

Is this architecture complete and correct? Output JSON only.`;

  const model = getModelForTask('validation');
  const content = await litellmChatCompletion({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
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
    const passed = parsed.passed === true;
    const issues = Array.isArray(parsed.issues)
      ? (parsed.issues as string[]).filter((s) => typeof s === 'string')
      : [];
    return { passed, issues };
  } catch {
    return { passed: true, issues: [] };
  }
}
