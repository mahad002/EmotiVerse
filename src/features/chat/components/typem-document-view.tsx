'use client';

import { TypeMSectionBlock } from '@/features/chat/components/typem-section-block';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
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
          'rounded-lg border border-sky-200 dark:border-sky-900/50 overflow-hidden',
          'bg-white dark:bg-[#0a0f0d] text-sm px-3 py-4 text-center text-gray-500 dark:text-slate-400',
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
        'rounded-lg overflow-hidden border border-sky-200 dark:border-sky-900/50',
        'bg-white dark:bg-[#0a0f0d] shadow-sm min-w-0 max-w-full',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-sky-100 dark:border-sky-900/40 bg-sky-50/80 dark:bg-sky-950/20">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
            {title}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-100 dark:text-sky-400 dark:hover:bg-sky-900/50 gap-1"
          onClick={handleDownloadFull}
        >
          <Download className="w-3 h-3" />
          Download full document
        </Button>
      </div>
      <div className="divide-y divide-sky-100 dark:divide-sky-900/40">
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
