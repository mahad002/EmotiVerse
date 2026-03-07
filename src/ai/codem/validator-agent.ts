'use server';

/**
 * Validator agent: reviews generated code against architecture, returns pass/fail and issues.
 */

import { litellmChatCompletion } from '@/ai/litellm-client';
import { getModelForTask } from './model-router';
import type { GeneratedFile, Plan, ValidationResult, TaskDefinition } from './types';

function hasHtmlDocumentShape(content: string): boolean {
  const sample = content.trim().toLowerCase();
  return sample.startsWith('<!doctype html') || sample.includes('<html') || sample.includes('<body');
}

function hasComponentCodeShape(content: string): boolean {
  return /export\s+default|function\s+[A-Z]\w*\s*\(|const\s+[A-Z]\w*\s*=/.test(content);
}

function validateFileShape(file: GeneratedFile): ValidationResult | null {
  const ext = file.path.split('.').pop()?.toLowerCase() ?? '';
  const content = file.content || '';

  if (['jsx', 'tsx', 'js', 'ts'].includes(ext) && hasHtmlDocumentShape(content)) {
    return {
      passed: false,
      issues: [`${file.path} looks like an HTML document, not a ${ext.toUpperCase()} source file.`],
      severity: 'error',
    };
  }

  if (ext === 'html' && hasComponentCodeShape(content)) {
    return {
      passed: false,
      issues: [`${file.path} looks like component/application code, not an HTML document.`],
      severity: 'error',
    };
  }

  return null;
}

export async function validateFile(
  file: GeneratedFile,
  plan: Plan,
  relatedFiles: { path: string; content: string }[],
  task?: TaskDefinition
): Promise<ValidationResult> {
  const shapeValidation = validateFileShape(file);
  if (shapeValidation) {
    return shapeValidation;
  }

  const model = getModelForTask('validation');
  const archSummary =
    plan.type === 'project'
      ? `Project type: ${plan.architecture.projectType}. Expected structure: ${plan.architecture.structure.map((n) => n.path).join(', ')}.`
      : 'Single-file implementation.';

  const relatedBlob =
    relatedFiles.length > 0
      ? relatedFiles.map((f) => `--- ${f.path} ---\n${f.content.slice(0, 1500)}`).join('\n\n')
      : '';

  const taskContext = task
    ? `\nTask that produced this file: "${task.description}". Target files for this task: [${task.targetFiles.join(', ')}].`
    : '';

  const systemPrompt = `You are a code reviewer. Check the generated file against the architecture and related files.
${archSummary}

**File identity check (critical):** First verify that the content actually belongs in this file path. For example:
- index.html must be the HTML shell (doctype, html, body, script to load the app); it must NOT be React/JSX component code.
- src/App.jsx (or App.tsx) must be the React root component; it must NOT be a full HTML document.
If the content is for a different file (e.g. full HTML in a .jsx file, or component code in index.html), set passed: false and in issues state the mismatch (e.g. "Content is an HTML document but path is App.jsx; this belongs in index.html").

Then check correctness and architecture. Output a JSON object only:
{
  "passed": true or false,
  "issues": ["list of specific issues found, or empty if passed"],
  "severity": "error" or "warning"
}
Use "error" if the code would break the build, violates the architecture, or content is in the wrong file; use "warning" for style or minor issues.
Output ONLY valid JSON.`;

  const userContent = `File path: ${file.path}${taskContext}

\`\`\`${file.language ?? 'text'}\n${file.content.slice(0, 4000)}\n\`\`\`

${relatedBlob ? `Related files:\n${relatedBlob}` : ''}

Does this content actually belong in ${file.path}? Check file identity and correctness, then output JSON.`;

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
