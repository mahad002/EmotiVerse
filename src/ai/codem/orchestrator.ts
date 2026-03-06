'use server';

/**
 * Code M agent orchestrator: intent -> plan -> execute -> validate -> assemble.
 * Runs project tasks sequentially so one failure does not stop the rest; emits plan_ready for UI todo list.
 */

import { generateOpenAIResponse } from '@/ai/openai-handler';
import { codeMPersona } from '@/config/personas';
import { parseCodeMResponse } from '@/features/chat/lib/parse-codem-response';
import type { MessageSegment } from '@/features/chat/lib/chat-types';
import { classifyIntent } from './intent-classifier';
import { createPlan, type Plan } from './planner-agent';
import { executeTask, executeSimplePlan } from './executor-agent';
import { validateFile } from './validator-agent';
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
  const fullText = result.response?.join('') ?? '';
  const segments = parseCodeMResponse(fullText);
  return {
    type: 'simple',
    response: fullText,
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
    onProgress?.({ stage: 'planning', detail: intent.type === 'project' ? 'Generating architecture...' : 'Planning...' });

    let plan: Plan;
    try {
      plan = await createPlan(message, intent);
    } catch (planError) {
      console.error('Code M planner failed, falling back to single-call:', planError);
      return fallbackSingleCall(input);
    }

    if (plan.type === 'simple') {
      const { response, files } = await executeSimplePlan(plan, sessionId);
      const segments = buildSegmentsFromFiles(response, files);
      onProgress?.({ stage: 'complete' });
      return { type: 'simple', response, segments };
    }

    // Project mode: emit plan so client can show architecture + todo list
    const projectPlan = plan as ProjectPlan;
    onProgress?.({ stage: 'plan_ready', plan: projectPlan });

    const allFiles: GeneratedFile[] = [];
    const completed = new Set<string>();

    // Run tasks sequentially so one failure does not stop the rest; no breakage until all attempted
    while (completed.size < projectPlan.tasks.length) {
      const runnableIds = getRunnableTaskIds(projectPlan, completed);
      if (runnableIds.length === 0) break;

      const runnableTasks = projectPlan.tasks.filter((t) => runnableIds.includes(t.id));

      for (const task of runnableTasks) {
        const taskIndex = projectPlan.tasks.findIndex((t) => t.id === task.id);
        onProgress?.({
          stage: 'executing',
          taskId: task.id,
          taskIndex: taskIndex >= 0 ? taskIndex : completed.size,
          totalTasks: projectPlan.tasks.length,
        });

        let taskFiles: GeneratedFile[] = [];
        try {
          let attempt = 0;
          let fixPrompt: string | undefined;

          while (attempt <= MAX_FIX_ATTEMPTS) {
            if (attempt > 0) {
              onProgress?.({ stage: 'fixing', taskId: task.id, attempt });
            }
            taskFiles = await executeTask(task, projectPlan, sessionId, fixPrompt);
            onProgress?.({ stage: 'validating', taskId: task.id });

            const relatedFiles = allFiles.map((f) => ({ path: f.path, content: f.content }));
            let allPassed = true;
            for (const file of taskFiles) {
              try {
                const validation = await validateFile(file, projectPlan, relatedFiles);
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
          projectPlan,
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
      plan: projectPlan,
      directoryTree,
      setupCommands,
    };
  } catch (err) {
    console.error('Code M agent error:', err);
    return fallbackSingleCall(input);
  }
}
