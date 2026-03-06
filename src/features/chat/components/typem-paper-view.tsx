'use client';

import { TypeMOutlineTodo } from '@/features/chat/components/typem-outline-todo';
import { TypeMSectionBlock } from '@/features/chat/components/typem-section-block';
import { PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TypeMPaperViewProps {
  documentPlan: { title: string; sections: { id: string; title: string; description: string }[] };
  documentSections?: { id: string; title: string; description: string; content: string }[];
  className?: string;
}

/**
 * Type M document output in a separate paper-styled container (like Code M's terminal view).
 * Textured paper background, distinct from the chat bubble.
 */
export function TypeMPaperView({
  documentPlan,
  documentSections = [],
  className,
}: TypeMPaperViewProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden min-w-0 max-w-full',
        'border border-amber-200/80 dark:border-[#2d2a26]',
        'shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]',
        'dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]',
        className
      )}
    >
      {/* Textured paper background */}
      <div
        className="absolute inset-0 pointer-events-none rounded-xl opacity-[0.4] dark:opacity-[0.25]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="relative rounded-xl min-h-[120px] bg-[#fefdfb] dark:bg-[#1a1815]">
        <div className="relative rounded-xl p-4 space-y-4">
          {/* Process / steps at top */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              How this was written
            </p>
            <TypeMOutlineTodo
              plan={documentPlan}
              currentSectionIndex={documentSections.length}
              totalSections={documentPlan.sections.length}
            />
          </div>

          {/* Document title */}
          <div className="rounded-lg border border-amber-200/70 dark:border-[#2d2a26] overflow-hidden bg-amber-50/50 dark:bg-[#171412] px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <PenLine className="w-3.5 h-3.5" />
              Document
            </p>
            <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{documentPlan.title}</p>
            {documentPlan.sections.length > 0 && documentSections.length === 0 && (
              <p className="text-[11px] text-stone-500 dark:text-stone-300 mt-1.5">
                Sections are listed above.
              </p>
            )}
          </div>

          {/* Written output */}
          {documentSections.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                Written output
              </p>
              {documentSections.map((sec) => (
                <TypeMSectionBlock
                  key={sec.id}
                  title={sec.title}
                  content={sec.content}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
