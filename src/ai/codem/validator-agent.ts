'use server';

/**
 * Validator agent: reviews generated code against architecture, returns pass/fail and issues.
 */

import { litellmChatCompletion } from '@/ai/litellm-client';
import { getModelForTask } from './model-router';
import type { GeneratedFile, Plan, ValidationResult } from './types';

export async function validateFile(
  file: GeneratedFile,
  plan: Plan,
  relatedFiles: { path: string; content: string }[]
): Promise<ValidationResult> {
  const model = getModelForTask('validation');
  const archSummary =
    plan.type === 'project'
      ? `Project type: ${plan.architecture.projectType}. Expected structure: ${plan.architecture.structure.map((n) => n.path).join(', ')}.`
      : 'Single-file implementation.';

  const relatedBlob =
    relatedFiles.length > 0
      ? relatedFiles.map((f) => `--- ${f.path} ---\n${f.content.slice(0, 1500)}`).join('\n\n')
      : '';

  const systemPrompt = `You are a code reviewer. Check the generated file against the architecture and related files.
${archSummary}

Output a JSON object only:
{
  "passed": true or false,
  "issues": ["list of specific issues found, or empty if passed"],
  "severity": "error" or "warning"
}
Use "error" if the code would break the build or violate the architecture; use "warning" for style or minor issues.
Output ONLY valid JSON.`;

  const userContent = `File: ${file.path}\n\n\`\`\`${file.language ?? 'text'}\n${file.content.slice(0, 4000)}\n\`\`\`

${relatedBlob ? `Related files:\n${relatedBlob}` : ''}`;

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
