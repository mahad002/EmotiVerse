'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TypeMSectionBlockProps {
  title: string;
  content: string;
  sectionId?: string;
  className?: string;
}

export function TypeMSectionBlock({
  title,
  content,
  className,
}: TypeMSectionBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = `## ${title}\n\n${content}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const safeName = (title.replace(/[^a-z0-9]/gi, '-') || 'section').slice(0, 40);
    const filename = `${safeName}.txt`;
    const text = `## ${title}\n\n${content}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden border border-sky-200 dark:border-sky-900/50',
        'bg-white dark:bg-[#0a0f0d] shadow-sm my-1.5 min-w-0 max-w-full',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-sky-100 dark:border-sky-900/40 bg-sky-50 dark:bg-sky-950/30">
        <span className="text-xs font-medium text-sky-700 dark:text-sky-400 truncate">
          {title}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded text-sky-600 hover:text-sky-700 hover:bg-sky-100 dark:text-sky-400 dark:hover:bg-sky-900/50"
            onClick={handleDownload}
            aria-label="Download section"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded text-sky-600 hover:text-sky-700 hover:bg-sky-100 dark:text-sky-400 dark:hover:bg-sky-900/50"
            onClick={handleCopy}
            aria-label="Copy section"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      <div className="overflow-auto bg-slate-50 dark:bg-[#0d1117] min-h-[60px] max-h-[50vh]">
        <div className="p-3 text-[13px] leading-relaxed whitespace-pre-wrap break-words text-slate-800 dark:text-slate-200">
          {content || '(empty)'}
        </div>
      </div>
    </div>
  );
}
