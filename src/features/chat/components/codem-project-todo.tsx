'use client';

import { cn } from '@/lib/utils';
import { Check, Circle, Loader2, FolderTree, FileCode } from 'lucide-react';
import type { ProjectPlan } from '@/ai/codem/types';

export interface CodeMProjectTodoProps {
  plan: ProjectPlan;
  currentTaskIndex: number;
  totalTasks: number;
  className?: string;
}

export function CodeMProjectTodo({
  plan,
  currentTaskIndex,
  totalTasks,
  className,
}: CodeMProjectTodoProps) {
  const { architecture, tasks } = plan;

  return (
    <div
      className={cn(
        'rounded-lg border border-emerald-200 dark:border-emerald-900/50 overflow-hidden',
        'bg-white dark:bg-[#0a0f0d] text-sm',
        className
      )}
    >
      {/* Architecture */}
      <div className="px-3 py-2 border-b border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/80 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2 mb-1.5">
          <FolderTree className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold text-emerald-800 dark:text-emerald-300 text-xs uppercase tracking-wider">
            Architecture
          </span>
        </div>
        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono mb-1">
          {architecture.projectType}
          {architecture.frameworks?.length ? ` · ${architecture.frameworks.join(', ')}` : ''}
        </p>
        {architecture.structure?.length > 0 && (
          <ul className="text-[11px] text-gray-600 dark:text-slate-400 font-mono space-y-0.5 max-h-24 overflow-y-auto">
            {architecture.structure.map((node, i) => (
              <li key={i} className="truncate">
                {node.path}
                {node.description ? ` — ${node.description}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Task / file list */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1.5">
          <FileCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold text-emerald-800 dark:text-emerald-300 text-xs uppercase tracking-wider">
            Files · {currentTaskIndex}/{totalTasks}
          </span>
        </div>
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {tasks.map((task, i) => {
            const isDone = i < currentTaskIndex;
            const isCurrent = i === currentTaskIndex;
            const label = task.targetFiles?.length ? task.targetFiles[0] : task.description;
            return (
              <li
                key={task.id}
                className={cn(
                  'flex items-center gap-2 text-xs font-mono',
                  isDone && 'text-emerald-700 dark:text-emerald-400',
                  isCurrent && 'text-emerald-600 dark:text-emerald-300',
                  !isDone && !isCurrent && 'text-gray-500 dark:text-slate-500'
                )}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                ) : isCurrent ? (
                  <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-emerald-500" />
                ) : (
                  <Circle className="w-3.5 h-3.5 shrink-0 opacity-50" />
                )}
                <span className="truncate">{label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
