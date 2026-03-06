'use client';

import { cn } from '@/lib/utils';

export type CodeMPipelineStage =
  | 'classifying'
  | 'planning'
  | 'executing'
  | 'validating'
  | 'fixing'
  | 'complete'
  | null;

export interface CodeMProgressProps {
  stage: CodeMPipelineStage;
  detail?: string;
  taskIndex?: number;
  totalTasks?: number;
  taskId?: string;
  attempt?: number;
  className?: string;
}

function stageLabel(props: CodeMProgressProps): string {
  const { stage, detail, taskIndex, totalTasks, attempt } = props;
  switch (stage) {
    case 'classifying':
      return 'Understanding request…';
    case 'planning':
      return detail ?? 'Planning…';
    case 'executing':
      if (totalTasks != null && totalTasks > 0 && taskIndex != null) {
        return `Generating file ${taskIndex + 1}/${totalTasks}…`;
      }
      return 'Generating code…';
    case 'validating':
      return 'Validating…';
    case 'fixing':
      return attempt != null && attempt > 0 ? `Fixing (attempt ${attempt + 1})…` : 'Fixing…';
    case 'complete':
      return 'Done.';
    default:
      return '> generating...';
  }
}

export function CodeMProgress({
  stage,
  detail,
  taskIndex,
  totalTasks,
  attempt,
  className,
}: CodeMProgressProps) {
  const label = stageLabel({ stage, detail, taskIndex, totalTasks, attempt });

  return (
    <div
      className={cn(
        'flex items-center gap-2 py-1.5 px-2 rounded-md',
        'bg-emerald-500/5 border border-emerald-500/20',
        'font-mono text-xs text-emerald-700 dark:text-emerald-400',
        className
      )}
    >
      <span className="flex gap-1 shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse delay-75" style={{ animationDelay: '75ms' }} />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse delay-150" style={{ animationDelay: '150ms' }} />
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}
