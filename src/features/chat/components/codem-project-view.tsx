'use client';

import { useState } from 'react';
import { CodeMCodeBlock } from '@/features/chat/components/codem-code-block';
import { CodeMFolderTree } from '@/features/chat/components/codem-folder-tree';
import { CodeMTerminalBlock } from '@/features/chat/components/codem-terminal-block';
import type { TerminalGroup } from '@/features/chat/components/codem-terminal-block';

/** Convert a unix-style path to Windows backslash path */
function toWin(p: string) { return p.replace(/\//g, '\\'); }
import type { GeneratedFile, AgentPlanSummary } from '@/features/chat/lib/chat-types';
import { cn } from '@/lib/utils';
import { FileCode, FolderOpen, ChevronRight } from 'lucide-react';

export interface CodeMProjectViewProps {
  files: GeneratedFile[];
  plan?: AgentPlanSummary | null;
  className?: string;
}

function buildFileTree(files: GeneratedFile[]): { path: string; file: GeneratedFile }[] {
  return files.map((file) => ({ path: file.path, file }));
}

/** Deduplicate by path (first occurrence wins) so React keys are unique. */
function dedupeFilesByPath(files: GeneratedFile[]): GeneratedFile[] {
  const seen = new Set<string>();
  return files.filter((f) => {
    if (seen.has(f.path)) return false;
    seen.add(f.path);
    return true;
  });
}

/** Collect unique parent directories sorted shallow → deep */
function collectDirs(filePaths: string[]): string[] {
  const dirSet = new Set<string>();
  for (const p of filePaths) {
    const parts = p.split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
      dirSet.add(parts.slice(0, i).join('/'));
    }
  }
  return [...dirSet].sort((a, b) => {
    const da = a.split('/').length;
    const db = b.split('/').length;
    if (da !== db) return da - db;
    return a.localeCompare(b);
  });
}

/**
 * Returns separate command groups for Unix (Mac/Linux) and Windows (CMD).
 * mkdir/touch ↔ mkdir/type nul >
 */
function buildSetupCommandGroups(
  filePaths: string[],
  setupCommands: string[]
): { unix: TerminalGroup[]; windows: TerminalGroup[] } {
  const unix: TerminalGroup[] = [];
  const windows: TerminalGroup[] = [];

  if (filePaths.length > 0) {
    const dirs = collectDirs(filePaths);

    if (dirs.length > 0) {
      unix.push({
        label: 'Create folders (in order)',
        commands: dirs.map((d) => `mkdir -p ${d}`),
      });
      windows.push({
        label: 'Create folders (in order)',
        // Windows CMD mkdir creates intermediate dirs in one call
        commands: dirs.map((d) => `mkdir ${toWin(d)}`),
      });
    }

    unix.push({
      label: 'Create files',
      commands: filePaths.map((p) => `touch ${p}`),
    });
    windows.push({
      label: 'Create files',
      // type nul > creates an empty file on CMD
      commands: filePaths.map((p) => `type nul > ${toWin(p)}`),
    });
  }

  if (setupCommands.length > 0) {
    // npm/yarn/pnpm commands are the same on both platforms
    unix.push({ label: 'Install & run', commands: setupCommands });
    windows.push({ label: 'Install & run', commands: setupCommands });
  }

  return { unix, windows };
}

function PlanHeader({ plan }: { plan: AgentPlanSummary }) {
  return (
    <div className="px-3 py-2 border-b border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/80 dark:bg-emerald-950/20">
      {plan.architecture && (
        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono mb-1">
          {plan.architecture}
        </p>
      )}
      {plan.tasks.length > 0 && (
        <p className="text-[11px] text-gray-600 dark:text-slate-400">
          Tasks: {plan.tasks.length} — {plan.tasks.slice(0, 3).join('; ')}
          {plan.tasks.length > 3 ? '…' : ''}
        </p>
      )}
    </div>
  );
}

function SetupSection({ plan }: { plan?: AgentPlanSummary | null }) {
  if (!plan) return null;
  const filePaths = plan.filePaths ?? [];
  const setupCommands = plan.setupCommands ?? [];
  const { unix, windows } = buildSetupCommandGroups(filePaths, setupCommands);
  const hasFolderTree = filePaths.length > 0;
  const hasCommands = unix.length > 0 || windows.length > 0;

  if (!hasFolderTree && !hasCommands) return null;

  return (
    <div className="border-t border-emerald-100 dark:border-emerald-900/40 space-y-3 px-3 py-3 bg-emerald-50/30 dark:bg-emerald-950/10">
      {hasFolderTree && (
        <CodeMFolderTree paths={filePaths} projectName="project" />
      )}
      {hasCommands && (
        <CodeMTerminalBlock
          unixGroups={unix}
          windowsGroups={windows}
          title="setup commands"
        />
      )}
    </div>
  );
}

export function CodeMProjectView({ files, plan, className }: CodeMProjectViewProps) {
  const uniqueFiles = dedupeFilesByPath(files);
  const hasFiles = uniqueFiles.length > 0;
  const [selectedPath, setSelectedPath] = useState<string>(uniqueFiles[0]?.path ?? '');
  const tree = buildFileTree(uniqueFiles);
  const selected = uniqueFiles.find((f) => f.path === selectedPath) ?? uniqueFiles[0];

  if (!hasFiles) {
    return (
      <div
        className={cn(
          'rounded-lg border border-emerald-200 dark:border-emerald-900/50 overflow-hidden',
          'bg-white dark:bg-[#0a0f0d] text-sm',
          className
        )}
      >
        {plan && (plan.tasks.length > 0 || plan.architecture) && <PlanHeader plan={plan} />}
        <SetupSection plan={plan} />
        <div className="px-3 py-3 text-center text-gray-500 dark:text-slate-400 text-xs">
          Files are shown as individual messages below.
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden border border-emerald-200 dark:border-emerald-900/50',
        'bg-white dark:bg-[#0a0f0d] shadow-sm min-w-0 max-w-full',
        className
      )}
    >
      {plan && (plan.tasks.length > 0 || plan.architecture) && <PlanHeader plan={plan} />}
      <SetupSection plan={plan} />

      <div className="flex flex-col sm:flex-row min-h-0">
        {/* File list */}
        <div className="w-full sm:w-48 flex-shrink-0 border-b sm:border-b-0 sm:border-r border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 max-h-48 sm:max-h-64 overflow-y-auto">
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-emerald-100 dark:border-emerald-900/40">
            <FolderOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Files
            </span>
          </div>
          <ul className="py-1">
            {tree.map(({ path }, index) => {
              const isSelected = selectedPath === path;
              const name = path.split('/').pop() ?? path;
              return (
                <li key={`${path}-${index}`}>
                  <button
                    type="button"
                    onClick={() => setSelectedPath(path)}
                    className={cn(
                      'w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-xs font-mono truncate',
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-emerald-500/10'
                    )}
                  >
                    <ChevronRight
                      className={cn('w-3 h-3 shrink-0', isSelected ? 'text-emerald-600' : 'text-gray-400')}
                    />
                    <FileCode className="w-3 h-3 shrink-0 text-emerald-600 dark:text-emerald-500" />
                    <span className="truncate">{name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Code viewer */}
        <div className="flex-1 min-w-0 min-h-[200px] overflow-auto flex flex-col">
          {selected && (
            <CodeMCodeBlock
              segment={{
                type: 'code',
                code: selected.content ?? '',
                language: selected.language ?? 'text',
                filename: selected.path.split('/').pop() ?? selected.path,
              }}
              className="rounded-none border-0 border-t sm:border-t-0 sm:border-l border-emerald-100 dark:border-emerald-900/40 flex-1 min-h-0"
            />
          )}
        </div>
      </div>
    </div>
  );
}
