'use client';

import { cn } from '@/lib/utils';

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
      return 'Understanding request…';
    case 'outlining':
      return detail ?? 'Creating outline…';
    case 'outline_ready':
      return 'Outline ready.';
    case 'expanding':
      if (totalSections != null && totalSections > 0 && sectionIndex != null) {
        return `Writing section ${sectionIndex + 1}/${totalSections}…`;
      }
      return 'Writing section…';
    case 'reviewing':
      return 'Reviewing…';
    case 'fixing':
      return attempt != null && attempt > 0 ? `Revising (attempt ${attempt + 1})…` : 'Revising…';
    case 'section_generated':
      return 'Section done.';
    case 'complete':
      return 'Done.';
    default:
      return '> writing...';
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
        'flex items-center gap-2 py-1.5 px-2 rounded-md',
        'bg-sky-500/5 border border-sky-500/20',
        'font-mono text-xs text-sky-700 dark:text-sky-400',
        className
      )}
    >
      <span className="flex gap-1 shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse delay-75" style={{ animationDelay: '75ms' }} />
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse delay-150" style={{ animationDelay: '150ms' }} />
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}
