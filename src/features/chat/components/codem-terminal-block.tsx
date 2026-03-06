'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TerminalGroup {
  label: string;
  commands: string[];
}

export type OsVariant = 'unix' | 'windows';

interface CodeMTerminalBlockProps {
  /** Commands for Mac / Linux (bash) */
  unixGroups: TerminalGroup[];
  /** Commands for Windows (CMD) */
  windowsGroups: TerminalGroup[];
  title?: string;
  className?: string;
}

const OS_TABS: { id: OsVariant; label: string; prompt: string }[] = [
  { id: 'unix',    label: 'Mac / Linux', prompt: '$'  },
  { id: 'windows', label: 'Windows',     prompt: '>'  },
];

export function CodeMTerminalBlock({
  unixGroups,
  windowsGroups,
  title = 'setup commands',
  className,
}: CodeMTerminalBlockProps) {
  const [os, setOs] = useState<OsVariant>('unix');
  const [copiedLine, setCopiedLine] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const groups = os === 'unix' ? unixGroups : windowsGroups;
  const prompt = OS_TABS.find((t) => t.id === os)?.prompt ?? '$';

  const copyLine = async (cmd: string) => {
    await navigator.clipboard.writeText(cmd);
    setCopiedLine(cmd);
    setTimeout(() => setCopiedLine(null), 2000);
  };

  const copyAll = async () => {
    const commentChar = os === 'unix' ? '#' : 'REM';
    const text = groups
      .map((g) => `${commentChar} ${g.label}\n${g.commands.join('\n')}`)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const allEmpty = unixGroups.length === 0 && windowsGroups.length === 0;
  if (allEmpty) return null;

  return (
    <div className={cn('rounded-lg overflow-hidden border border-zinc-700 shadow-md', className)}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-800 dark:bg-zinc-900 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
          <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
            <Terminal className="w-3 h-3" />
            {title}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] text-zinc-300 hover:text-white hover:bg-zinc-700 gap-1"
          onClick={copyAll}
        >
          {copiedAll ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          Copy all
        </Button>
      </div>

      {/* OS tab switcher */}
      <div className="flex bg-zinc-800/80 dark:bg-zinc-900/80 border-b border-zinc-700">
        {OS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setOs(tab.id)}
            className={cn(
              'px-3 py-1 text-[11px] font-mono transition-colors',
              os === tab.id
                ? 'text-emerald-400 border-b-2 border-emerald-500 bg-zinc-900/60'
                : 'text-zinc-400 hover:text-zinc-200 border-b-2 border-transparent'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Command body */}
      <div className="bg-zinc-900 dark:bg-[#111] px-3 py-2.5 space-y-3 font-mono text-[12px] overflow-x-auto">
        {groups.length === 0 ? (
          <p className="text-zinc-500 text-[11px]">No commands for this platform.</p>
        ) : (
          groups.map((group, gi) => (
            <div key={gi}>
              <p className={cn(
                'text-[10px] uppercase tracking-widest mb-1 select-none',
                os === 'unix' ? 'text-emerald-400/70' : 'text-sky-400/70'
              )}>
                {os === 'unix' ? '#' : 'REM'} {group.label}
              </p>
              {group.commands.map((cmd, ci) => (
                <div
                  key={ci}
                  className="group/line flex items-center gap-2 rounded px-1 -mx-1 hover:bg-zinc-800/60 cursor-default"
                >
                  <span className={cn(
                    'select-none shrink-0',
                    os === 'unix' ? 'text-emerald-500' : 'text-sky-400'
                  )}>
                    {prompt}
                  </span>
                  <span className="text-zinc-100 flex-1 whitespace-pre break-all">{cmd}</span>
                  <button
                    type="button"
                    onClick={() => copyLine(cmd)}
                    className="shrink-0 opacity-0 group-hover/line:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-200 p-0.5"
                    aria-label="Copy command"
                  >
                    {copiedLine === cmd ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ))
        )}

        {/* Blinking cursor */}
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('select-none', os === 'unix' ? 'text-emerald-500' : 'text-sky-400')}>
            {prompt}
          </span>
          <span className="inline-block w-2 h-3.5 bg-zinc-300 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
