'use server';

/**
 * Code M agent orchestrator: intent -> plan -> execute -> validate -> assemble.
 * Runs project tasks sequentially so one failure does not stop the rest; emits plan_ready for UI todo list.
 */

import { generateOpenAIResponse } from '@/ai/openai-handler';
import { codeMPersona } from '@/config/personas';
import { parseCodeMResponse } from '@/features/chat/lib/parse-codem-response';
import type { MessageSegment } from '@/features/chat/lib/chat-types';
import { litellmChatCompletion } from '@/ai/litellm-client';
import { getModelForTask } from './model-router';
import * as vectorStore from './vector-store';
import { classifyIntent } from './intent-classifier';
import { createPlan, type Plan } from './planner-agent';
import { executeTask, executeSimplePlan, executeLongFileTask } from './executor-agent';
import { generateSkeleton } from './skeleton-agent';
import { validateFile } from './validator-agent';
import { validateArchitecture } from './architecture-validator';
import { generateReadme } from './readme-generator';
import { buildDirectoryTree } from './directory-tree';
import type {
  AgentInput,
  AgentOutput,
  ProgressEvent,
  ProjectPlan,
  GeneratedFile,
} from './types';

const MAX_FIX_ATTEMPTS = 2;

function buildSegmentsFromFiles(response: string, files: GeneratedFile[]): MessageSegment[] {
  const segments: MessageSegment[] = [];
  if (response.trim()) segments.push({ type: 'text', text: response });
  for (const f of files) {
    segments.push({
      type: 'code',
      code: f.content,
      language: f.language,
      filename: f.path.split('/').pop() ?? f.path,
    });
  }
  return segments.length > 0 ? segments : [{ type: 'text', text: 'Done.' }];
}

/**
 * Run tasks in dependency order; run independent tasks in parallel.
 */
function getRunnableTaskIds(
  plan: ProjectPlan,
  completed: Set<string>
): string[] {
  return plan.tasks
    .filter((t) => !completed.has(t.id) && t.dependsOn.every((id) => completed.has(id)))
    .map((t) => t.id);
}

/**
 * Fallback: single-call Code M (existing flow) when planner fails.
 */
async function fallbackSingleCall(input: AgentInput): Promise<AgentOutput> {
  const persona = codeMPersona.systemPrompt;
  const result = await generateOpenAIResponse({
    message: input.message,
    persona,
    characterName: 'Code M',
    history: input.history,
  });
  const fullText = result.response?.join('\n') ?? '';
  const segments = parseCodeMResponse(fullText);
  return {
    type: 'simple',
    response: fullText,
    segments,
  };
}

/** Infer language from file path for completion prompt. */
function inferLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    py: 'python', css: 'css', html: 'html', json: 'json', md: 'markdown',
  };
  return map[ext] ?? ext;
}

/**
 * Completion flow: load last generated file from session, complete it, merge and return.
 * Only used when intent === 'completion'; does not touch project flow.
 */
async function runCompletionFlow(
  input: AgentInput,
  onProgress?: (event: ProgressEvent) => void
): Promise<AgentOutput> {
  const { sessionId } = input;
  const docs = vectorStore.getDocuments(sessionId);
  const codeDocs = docs.filter((d) => d.path !== 'README.md' && d.path !== 'SETUP.md');
  const lastDoc = codeDocs.length > 0 ? codeDocs[codeDocs.length - 1] : null;
  if (!lastDoc || !lastDoc.content.trim()) {
    return fallbackSingleCall(input);
  }

  onProgress?.({ stage: 'planning', detail: 'Completing the file...' });
  const lang = inferLanguageFromPath(lastDoc.path);
  const maxContext = 3500;
  const tail = lastDoc.content.length > maxContext
    ? lastDoc.content.slice(-maxContext)
    : lastDoc.content;

  const model = getModelForTask('long_code');
  const systemPrompt = `You are Code M. The user has a truncated or incomplete file. Your task is to output ONLY the continuation of the file—the part that is missing. Do not repeat any of the content you are given. Start from the very next character/line after the given content. Preserve the same style, indentation, and structure. Output a single markdown fenced code block with language ${lang}.`;
  const userPrompt = `Complete the following truncated file. Output ONLY the continuation in a single fenced code block (no repetition of the content below).\n\n\`\`\`${lang}\n${tail}\n\`\`\``;

  let continuation: string;
  try {
    const content = await litellmChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      maxTokens: 4096,
      temperature: 0.2,
    });
    const blockMatch = content.match(/```(?:\w*)\s*\n?([\s\S]*?)```/);
    continuation = blockMatch ? blockMatch[1].trim() : content.trim();
  } catch (err) {
    console.error('Code M completion call failed:', err);
    return fallbackSingleCall(input);
  }

  const completedContent = lastDoc.content.trimEnd() + '\n' + continuation;
  try {
    await vectorStore.addDocument(sessionId, completedContent, lastDoc.path);
  } catch {
    // non-fatal
  }

  const file: GeneratedFile = {
    path: lastDoc.path,
    content: completedContent,
    language: lang,
  };
  const segments = buildSegmentsFromFiles('Completed the file.', [file]);
  onProgress?.({ stage: 'complete' });
  return {
    type: 'simple',
    response: 'Completed the file.',
    segments,
  };
}

/**
 * Update flow: user wants to edit a specific segment/part of a previously generated file.
 * Load the file from session context (vector store), ask the model for the COMPLETE file with
 * that part updated, then return the full file so the user gets one complete fixed/improved file.
 */
async function runUpdateFlow(
  input: AgentInput,
  onProgress?: (event: ProgressEvent) => void
): Promise<AgentOutput> {
  const { message, sessionId } = input;
  const docs = vectorStore.getDocuments(sessionId);
  const codeDocs = docs.filter(
    (d) =>
      d.path !== 'README.md' &&
      d.path !== 'SETUP.md' &&
      !d.path.includes(':skeleton') &&
      !d.path.includes('#')
  );
  if (codeDocs.length === 0) {
    return fallbackSingleCall(input);
  }

  let targetDoc: { content: string; path: string };
  try {
    const searchResults = await vectorStore.search(sessionId, message, 2);
    const fromSearch = searchResults.find((r) =>
      codeDocs.some((d) => d.path === r.path)
    );
    targetDoc = fromSearch
      ? { path: fromSearch.path, content: fromSearch.content }
      : codeDocs[codeDocs.length - 1];
  } catch {
    targetDoc = codeDocs[codeDocs.length - 1];
  }

  if (!targetDoc.content.trim()) {
    return fallbackSingleCall(input);
  }

  onProgress?.({ stage: 'planning', detail: 'Updating the file...' });
  const lang = inferLanguageFromPath(targetDoc.path);
  const maxContext = 12000;
  const contentForPrompt =
    targetDoc.content.length > maxContext
      ? targetDoc.content.slice(0, maxContext) + '\n\n... (file truncated for context)'
      : targetDoc.content;

  const systemPrompt = `You are Code M. The user previously generated a file. They want you to update only a specific part (segment/section) of it. You MUST output the COMPLETE file with that part updated—one single file, not just the changed snippet. Use a single markdown fenced code block with the correct language (e.g. \`\`\`${lang}\`\`\`). Output ONLY the code block, no extra prose.`;
  const userPrompt = `Current file (${targetDoc.path}):\n\`\`\`${lang}\n${contentForPrompt}\n\`\`\`\n\nUser request: ${message}\n\nOutput the complete updated file in one code block (same path and language).`;

  let updatedContent: string;
  try {
    const response = await litellmChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: getModelForTask('code_generation'),
      maxTokens: 8192,
      temperature: 0.2,
    });
    const blockMatch = response.match(/```(?:\w*)\s*\n?([\s\S]*?)```/);
    updatedContent = blockMatch ? blockMatch[1].trim() : response.trim();
  } catch (err) {
    console.error('Code M update flow failed:', err);
    return fallbackSingleCall(input);
  }

  try {
    await vectorStore.addDocument(sessionId, updatedContent, targetDoc.path);
  } catch {
    // non-fatal
  }

  const file: GeneratedFile = {
    path: targetDoc.path,
    content: updatedContent,
    language: lang,
  };
  const segments = buildSegmentsFromFiles('Updated the file.', [file]);
  onProgress?.({ stage: 'complete' });
  return {
    type: 'simple',
    response: 'Updated the file. Here is the complete fixed/improved file:',
    segments,
  };
}

export async function runCodeMAgent(
  input: AgentInput,
  onProgress?: (event: ProgressEvent) => void
): Promise<AgentOutput> {
  const { message, history, sessionId } = input;

  try {
    onProgress?.({ stage: 'classifying' });
    const intent = await classifyIntent(message, history);

    if (intent.type === 'completion') {
      return runCompletionFlow(input, onProgress);
    }
    if (intent.type === 'update') {
      return runUpdateFlow(input, onProgress);
    }

    onProgress?.({ stage: 'planning', detail: intent.type === 'project' ? 'Generating architecture...' : 'Planning...' });

    let plan: Plan;
    try {
      plan = await createPlan(message, intent, history);
    } catch (planError) {
      console.error('Code M planner failed, falling back to single-call:', planError);
      return fallbackSingleCall(input);
    }

    if (plan.type === 'simple') {
      const useLongFileFlow =
        intent.complexity === 'high' &&
        plan.singleFileHint &&
        plan.singleFileHint.path.length > 0;

      if (useLongFileFlow) {
        try {
          const skeleton = await generateSkeleton(
            plan.description,
            plan.singleFileHint!.path,
            plan.singleFileHint!.language || 'text',
            sessionId
          );
          if (skeleton.checkpoints.length > 0) {
            const longResult = await executeLongFileTask(
              skeleton,
              plan.description,
              sessionId,
              (idx, total) => onProgress?.({ stage: 'planning', detail: `Generating segment ${idx}/${total}...` })
            );
            const segments = buildSegmentsFromFiles(
              `Here's the implementation for: ${plan.description}`,
              longResult.files
            );
            onProgress?.({ stage: 'complete' });
            return {
              type: 'simple',
              response: `Here's the implementation for: ${plan.description}`,
              segments,
            };
          }
        } catch (skeletonErr) {
          console.warn('Code M skeleton flow failed, falling back to one-shot:', skeletonErr);
        }
      }

      let result = await executeSimplePlan(plan, sessionId, { history });
      if (result.incomplete) {
        const retryMaxTokens = typeof process.env.LITELLM_CODE_MAX_TOKENS === 'string'
          ? parseInt(process.env.LITELLM_CODE_MAX_TOKENS, 10) || 4096
          : 4096;
        const retry = await executeSimplePlan(plan, sessionId, { maxTokens: retryMaxTokens, history });
        if (!retry.incomplete) result = retry;
      }
      const segments = buildSegmentsFromFiles(result.response, result.files);
      onProgress?.({ stage: 'complete' });
      return { type: 'simple', response: result.response, segments };
    }

    // Project mode: validate architecture (completeness, no missing files like App.jsx)
    const projectPlan = plan as ProjectPlan;
    let planToUse = projectPlan;
    try {
      onProgress?.({ stage: 'planning', detail: 'Checking architecture...' });
      const archValidation = await validateArchitecture(projectPlan, message);
      if (!archValidation.passed && archValidation.issues.length > 0) {
        const fixPrompt = `[Architecture review found issues that must be fixed in the plan: ${archValidation.issues.join('; ')}. Output a corrected plan that includes all required files (e.g. index.html and App.jsx for a React app) and assigns each to a task.]`;
        const correctedPlan = await createPlan(
          `${message}\n\n${fixPrompt}`,
          intent,
          history
        );
        if (correctedPlan.type === 'project') {
          planToUse = correctedPlan;
          onProgress?.({ stage: 'plan_ready', plan: planToUse });
        }
      } else {
        onProgress?.({ stage: 'plan_ready', plan: projectPlan });
      }
    } catch (archErr) {
      console.warn('Code M architecture validation skipped:', archErr);
      onProgress?.({ stage: 'plan_ready', plan: projectPlan });
    }

    const allFiles: GeneratedFile[] = [];
    const completed = new Set<string>();

    // Run tasks sequentially so one failure does not stop the rest; no breakage until all attempted
    while (completed.size < planToUse.tasks.length) {
      const runnableIds = getRunnableTaskIds(planToUse, completed);
      if (runnableIds.length === 0) break;

      const runnableTasks = planToUse.tasks.filter((t) => runnableIds.includes(t.id));

      for (const task of runnableTasks) {
        const taskIndex = planToUse.tasks.findIndex((t) => t.id === task.id);
        onProgress?.({
          stage: 'executing',
          taskId: task.id,
          taskIndex: taskIndex >= 0 ? taskIndex : completed.size,
          totalTasks: planToUse.tasks.length,
        });

        let taskFiles: GeneratedFile[] = [];
        try {
          let attempt = 0;
          let fixPrompt: string | undefined;

          while (attempt <= MAX_FIX_ATTEMPTS) {
            if (attempt > 0) {
              onProgress?.({ stage: 'fixing', taskId: task.id, attempt });
            }
            const taskResult = await executeTask(task, planToUse, sessionId, fixPrompt);
            taskFiles = taskResult.files;
            onProgress?.({ stage: 'validating', taskId: task.id });

            const relatedFiles = allFiles.map((f) => ({ path: f.path, content: f.content }));
            let allPassed = true;
            for (const file of taskFiles) {
              try {
                const validation = await validateFile(file, planToUse, relatedFiles, task);
                if (!validation.passed && validation.severity === 'error') {
                  allPassed = false;
                  fixPrompt = validation.issues.join('\n');
                  break;
                }
              } catch {
                allPassed = true;
              }
            }
            if (allPassed) break;
            attempt++;
          }
        } catch (taskErr) {
          console.error(`Code M task ${task.id} failed (continuing):`, taskErr);
        }

        completed.add(task.id);
        allFiles.push(...taskFiles);
        if (taskFiles.length > 0) {
          onProgress?.({ stage: 'file_generated', files: taskFiles });
        }
      }
    }

    // Directory tree for setup guide (layman-friendly)
    const directoryTree = buildDirectoryTree(
      allFiles.map((f) => f.path),
      'project'
    );

    // Append README and SETUP so user gets full project (architecture + files + readme + setup commands)
    let setupCommands: string[] = [];
    if (allFiles.length > 0) {
      try {
        const { readmeContent, setupCommands: commands } = await generateReadme(
          planToUse,
          allFiles,
          directoryTree
        );
        setupCommands = commands;
        const readmeFile: GeneratedFile = {
          path: 'README.md',
          content: readmeContent,
          language: 'markdown',
        };
        allFiles.push(readmeFile);
        onProgress?.({ stage: 'file_generated', files: [readmeFile] });

        const setupBody = [
          '# Setup (for beginners)',
          '',
          '## Directory structure',
          '',
          'Create this folder structure and put each generated file in the path shown:',
          '',
          '```',
          directoryTree,
          '```',
          '',
          '## Commands to run (copy-paste in order)',
          '',
          ...(setupCommands.length > 0
            ? setupCommands.map((c, i) => `${i + 1}. \`${c}\``)
            : ['(See README.md for install and run commands.)']),
        ].join('\n');
        const setupFile: GeneratedFile = {
          path: 'SETUP.md',
          content: setupBody,
          language: 'markdown',
        };
        allFiles.push(setupFile);
        onProgress?.({ stage: 'file_generated', files: [setupFile] });
      } catch (readmeErr) {
        console.error('Code M README generation failed:', readmeErr);
      }
    }

    const response = `Generated ${allFiles.length} file(s) for the project, including README and SETUP.`;
    onProgress?.({ stage: 'complete' });
    return {
      type: 'project',
      response,
      files: allFiles,
      plan: planToUse,
      directoryTree,
      setupCommands,
    };
  } catch (err) {
    console.error('Code M agent error:', err);
    return fallbackSingleCall(input);
  }
}
