'use client';

import { TypeMSectionBlock } from '@/features/chat/components/typem-section-block';
import { Button } from '@/components/ui/button';
import { Download, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DocumentSectionForView {
  id: string;
  title: string;
  description: string;
  content: string;
}

export interface TypeMDocumentViewProps {
  title: string;
  sections: DocumentSectionForView[];
  fullDocument?: string;
  className?: string;
}

export function TypeMDocumentView({
  title,
  sections,
  fullDocument,
  className,
}: TypeMDocumentViewProps) {
  const handleDownloadFull = () => {
    const body =
      fullDocument ??
      sections.map((s) => `## ${s.title}\n\n${s.content}`).join('\n\n---\n\n');
    const safeName = (title.replace(/[^a-z0-9]/gi, '-') || 'document').slice(0, 50);
    const filename = `${safeName}.txt`;
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (sections.length === 0) {
    return (
      <div
        className={cn(
          'rounded-xl border border-amber-200/70 dark:border-amber-800/50 overflow-hidden',
          'bg-[#fefdfb] dark:bg-stone-900/90 text-sm px-3 py-4 text-center text-stone-500 dark:text-stone-400',
          className
        )}
      >
        No sections yet.
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden border border-amber-200/70 dark:border-amber-800/50',
        'bg-[#fefdfb] dark:bg-stone-900/90 shadow-sm min-w-0 max-w-full',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-amber-100 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/30">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 border border-amber-200/60 dark:border-amber-800/40">
            <PenLine className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
          </div>
          <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
            {title}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50 gap-1"
          onClick={handleDownloadFull}
        >
          <Download className="w-3 h-3" />
          Download full document
        </Button>
      </div>
      <div className="divide-y divide-amber-100 dark:divide-amber-900/50">
        {sections.map((section) => (
          <TypeMSectionBlock
            key={section.id}
            title={section.title}
            content={section.content}
            sectionId={section.id}
          />
        ))}
      </div>
    </div>
  );
}
