'use client';

import { cn } from '@/lib/utils';
import { PenLine } from 'lucide-react';

export type TypeMPipelineStage =
  | 'classifying'
  | 'outlining'
  | 'outline_ready'
  | 'expanding'
  | 'reviewing'
  | 'fixing'
  | 'section_generated'
  | 'complete'
  | null;

export interface TypeMProgressProps {
  stage: TypeMPipelineStage;
  detail?: string;
  sectionIndex?: number;
  totalSections?: number;
  sectionId?: string;
  attempt?: number;
  className?: string;
}

function stageLabel(props: TypeMProgressProps): string {
  const { stage, detail, sectionIndex, totalSections, attempt } = props;
  switch (stage) {
    case 'classifying':
      return 'Reading your request…';
    case 'outlining':
      return detail ?? 'Drafting outline…';
    case 'outline_ready':
      return 'Outline ready.';
    case 'expanding':
      if (totalSections != null && totalSections > 0 && sectionIndex != null) {
        return `Drafting section ${sectionIndex + 1} of ${totalSections}…`;
      }
      return 'Drafting section…';
    case 'reviewing':
      return 'Reviewing draft…';
    case 'fixing':
      return attempt != null && attempt > 0 ? `Revising (draft ${attempt + 1})…` : 'Revising…';
    case 'section_generated':
      return 'Section done.';
    case 'complete':
      return 'All set.';
    default:
      return 'Drafting…';
  }
}

export function TypeMProgress({
  stage,
  detail,
  sectionIndex,
  totalSections,
  attempt,
  className,
}: TypeMProgressProps) {
  const label = stageLabel({ stage, detail, sectionIndex, totalSections, attempt });

  return (
    <div
      className={cn(
        'flex items-center gap-2 py-2 px-3 rounded-lg',
        'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40',
        'text-xs text-amber-900 dark:text-amber-200 font-medium',
        className
      )}
    >
      <PenLine className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
      <span className="flex gap-0.5 shrink-0">
        <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '0ms' }} />
        <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '120ms' }} />
        <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: '240ms' }} />
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}
