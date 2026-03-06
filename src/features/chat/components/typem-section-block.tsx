'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { buildSectionPdf } from '@/lib/typem-pdf';
import { Copy, Check, Download, FileDown, PenLine } from 'lucide-react';
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

  const handleDownloadPdf = () => {
    buildSectionPdf(title, content, (title.replace(/[^a-z0-9]/gi, '-') || 'document').replace(/-+/g, '-').slice(0, 50));
  };

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden border border-amber-200/70 dark:border-[#2d2a26]',
        'bg-[#fefdfb] dark:bg-[#1a1815] shadow-sm my-1.5 min-w-0 max-w-full',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-amber-100 dark:border-[#2d2a26] bg-amber-50/60 dark:bg-[#171412]">
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
            aria-label="Download as text"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50"
            onClick={handleDownloadPdf}
            aria-label="Download as PDF"
          >
            <FileDown className="h-3.5 w-3.5" />
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
      <div className="overflow-auto bg-[#faf8f5] dark:bg-[#141210] min-h-[60px] max-h-[50vh]">
        <div className="p-3 text-[13px] leading-relaxed break-words text-stone-800 dark:text-[#e8e6e3] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_p]:my-1.5 [&_strong]:font-semibold [&_a]:text-amber-700 [&_a]:dark:text-amber-400 [&_a]:underline">
          {content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h3 className="typem-prose-h3 text-base font-semibold mt-2 mb-1 text-amber-900 dark:text-amber-200">{children}</h3>,
                h2: ({ children }) => <h3 className="typem-prose-h3">{children}</h3>,
                h3: ({ children }) => <h3 className="typem-prose-h3">{children}</h3>,
                p: ({ children }) => <p className="my-1.5">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 my-1.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5">{children}</ol>,
                li: ({ children }) => <li className="my-0.5">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              }}
            >
              {content}
            </ReactMarkdown>
          ) : (
            <span className="text-stone-500 dark:text-stone-400">(empty)</span>
          )}
        </div>
      </div>
    </div>
  );
}
