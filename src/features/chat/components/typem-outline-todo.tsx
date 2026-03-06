'use client';

import { cn } from '@/lib/utils';
import { Check, Circle, Loader2, FileText, List } from 'lucide-react';
import type { DocumentPlan } from '@/ai/typem/types';

export interface TypeMOutlineTodoProps {
  plan: DocumentPlan;
  currentSectionIndex: number;
  totalSections: number;
  className?: string;
}

export function TypeMOutlineTodo(props: TypeMOutlineTodoProps) {
  const { plan, currentSectionIndex, totalSections, className } = props;
  const { title, sections } = plan;

  return (
    <div
      className={cn(
        'rounded-lg border border-sky-200 dark:border-sky-900/50 overflow-hidden',
        'bg-white dark:bg-[#0a0f0d] text-sm',
        className
      )}
    >
      <div className="px-3 py-2 border-b border-sky-100 dark:border-sky-900/40 bg-sky-50/80 dark:bg-sky-950/20">
        <div className="flex items-center gap-2 mb-1.5">
          <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="font-semibold text-sky-800 dark:text-sky-300 text-xs uppercase tracking-wider">
            Document
          </span>
        </div>
        <p className="text-xs text-sky-700 dark:text-sky-400 font-medium truncate">
          {title}
        </p>
      </div>
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1.5">
          <List className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="font-semibold text-sky-800 dark:text-sky-300 text-xs uppercase tracking-wider">
            Sections · {currentSectionIndex}/{totalSections}
          </span>
        </div>
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {sections.map((section, i) => {
            const isDone = i < currentSectionIndex;
            const isCurrent = i === currentSectionIndex;
            return (
              <li
                key={section.id}
                className={cn(
                  'flex items-center gap-2 text-xs',
                  isDone && 'text-sky-700 dark:text-sky-400',
                  isCurrent && 'text-sky-600 dark:text-sky-300',
                  !isDone && !isCurrent && 'text-gray-500 dark:text-slate-500'
                )}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5 shrink-0 text-sky-500" />
                ) : isCurrent ? (
                  <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-sky-500" />
                ) : (
                  <Circle className="w-3.5 h-3.5 shrink-0 opacity-50" />
                )}
                <span className="truncate">{section.title}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
