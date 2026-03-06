'use client';

import { cn } from '@/lib/utils';
import { Check, Circle, Loader2, FileText, List, PenLine } from 'lucide-react';
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
        'rounded-xl border border-amber-200/70 dark:border-[#2d2a26] overflow-hidden shadow-sm',
        'bg-[#fefdfb] dark:bg-[#1a1815] text-sm',
        className
      )}
    >
      <div className="px-3 py-2.5 border-b border-amber-100 dark:border-[#2d2a26] bg-amber-50/60 dark:bg-[#171412]">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 dark:bg-[#1f1c19] border border-amber-200/60 dark:border-[#2d2a26]">
            <PenLine className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
          </div>
          <span className="font-semibold text-amber-900 dark:text-amber-200 text-xs uppercase tracking-wider">
            Document
          </span>
        </div>
        <p className="text-xs text-stone-700 dark:text-stone-200 font-medium truncate pl-9">
          {title}
        </p>
      </div>
      <div className="px-3 py-2 dark:bg-[#1a1815]">
        <div className="flex items-center gap-2 mb-1.5">
          <List className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="font-semibold text-amber-900 dark:text-amber-200 text-xs uppercase tracking-wider">
            Sections · {currentSectionIndex} of {totalSections}
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
                  isDone && 'text-amber-800 dark:text-amber-300',
                  isCurrent && 'text-amber-900 dark:text-amber-200 font-medium',
                  !isDone && !isCurrent && 'text-stone-500 dark:text-stone-400'
                )}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                ) : isCurrent ? (
                  <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-amber-600 dark:text-amber-400" />
                ) : (
                  <Circle className="w-3.5 h-3.5 shrink-0 opacity-40 text-amber-700 dark:text-amber-500" />
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
