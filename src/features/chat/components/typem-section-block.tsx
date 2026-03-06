'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download, PenLine } from 'lucide-react';
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
        'rounded-xl overflow-hidden border border-amber-200/70 dark:border-amber-800/50',
        'bg-[#fefdfb] dark:bg-stone-900/90 shadow-sm my-1.5 min-w-0 max-w-full',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-amber-100 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/30">
        <div className="flex items-center gap-2 min-w-0">
          <PenLine className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 truncate">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50"
            onClick={handleDownload}
            aria-label="Download section"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50"
            onClick={handleCopy}
            aria-label="Copy section"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      <div className="overflow-auto bg-[#faf8f5] dark:bg-stone-950/80 min-h-[60px] max-h-[50vh]">
        <div className="p-3 text-[13px] leading-relaxed whitespace-pre-wrap break-words text-stone-800 dark:text-stone-200">
          {content || '(empty)'}
        </div>
      </div>
    </div>
  );
}
