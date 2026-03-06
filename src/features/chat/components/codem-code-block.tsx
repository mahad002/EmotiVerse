'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageSegment } from '@/features/chat/lib/chat-types';

export interface CodeMCodeBlockProps {
  segment: Extract<MessageSegment, { type: 'code' }>;
  className?: string;
}

/**
 * IDE-style code block for Code M: branded outer shell, header with filename/language, copy, and download.
 */
export function CodeMCodeBlock({ segment, className }: CodeMCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { code, language, filename } = segment;
  const label = filename ?? (language || 'code');
  const text = typeof code === 'string' ? code : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const name = (filename || language || 'code').replace(/^.*[/\\]/, '') || 'code.txt';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden border border-emerald-200 dark:border-emerald-900/50',
        'bg-white dark:bg-[#0a0f0d] shadow-sm',
        'my-1.5 min-w-0 max-w-full',
        className
      )}
    >
      {/* Header: filename/language + copy + download */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30">
        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 font-mono truncate">
          {label}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
            onClick={handleDownload}
            aria-label="Download file"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
            onClick={handleCopy}
            aria-label="Copy code"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      {/* Code area: explicit colors and scroll so content is always visible */}
      <div className="overflow-auto bg-slate-100 dark:bg-[#0d1117] min-h-[120px] max-h-[70vh]">
        <pre className="p-3 m-0 text-[13px] leading-relaxed font-mono whitespace-pre break-words">
          <code className="text-slate-800 dark:text-slate-200">
            {text || '(empty)'}
          </code>
        </pre>
      </div>
    </div>
  );
}
