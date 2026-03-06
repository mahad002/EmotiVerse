'use client';

import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  File,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  children: Map<string, TreeNode>;
}

function buildTree(paths: string[]): Map<string, TreeNode> {
  const root = new Map<string, TreeNode>();
  for (const filePath of paths) {
    const segments = filePath.split('/').filter(Boolean);
    let current = root;
    let accumulated = '';
    for (let i = 0; i < segments.length; i++) {
      const name = segments[i];
      const isFile = i === segments.length - 1;
      accumulated = accumulated ? `${accumulated}/${name}` : name;
      if (!current.has(name)) {
        current.set(name, { name, path: accumulated, isFile, children: new Map() });
      }
      current = current.get(name)!.children;
    }
  }
  return root;
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) return <FileCode className="w-3.5 h-3.5 shrink-0 text-yellow-500" />;
  if (['md', 'txt', 'json', 'yaml', 'yml', 'toml', 'env'].includes(ext)) return <FileText className="w-3.5 h-3.5 shrink-0 text-blue-400" />;
  if (['css', 'scss', 'sass', 'less'].includes(ext)) return <FileCode className="w-3.5 h-3.5 shrink-0 text-purple-400" />;
  if (['html', 'xml', 'svg'].includes(ext)) return <FileCode className="w-3.5 h-3.5 shrink-0 text-orange-400" />;
  if (['py', 'rb', 'rs', 'go', 'java', 'c', 'cpp', 'cs', 'php'].includes(ext)) return <FileCode className="w-3.5 h-3.5 shrink-0 text-green-400" />;
  return <File className="w-3.5 h-3.5 shrink-0 text-zinc-400" />;
}

interface TreeNodeViewProps {
  node: TreeNode;
  depth: number;
  defaultOpen?: boolean;
}

function TreeNodeView({ node, depth, defaultOpen = true }: TreeNodeViewProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = node.children.size > 0;
  const indent = depth * 14;

  if (node.isFile) {
    return (
      <div
        className="flex items-center gap-1.5 py-0.5 px-2 hover:bg-emerald-500/10 rounded select-none cursor-default"
        style={{ paddingLeft: indent + 8 }}
      >
        {fileIcon(node.name)}
        <span className="text-[12px] font-mono text-zinc-700 dark:text-zinc-300 truncate">{node.name}</span>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="w-full flex items-center gap-1 py-0.5 px-2 hover:bg-emerald-500/10 rounded text-left"
        style={{ paddingLeft: indent + 4 }}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDown className="w-3 h-3 shrink-0 text-zinc-400" />
        ) : (
          <ChevronRight className="w-3 h-3 shrink-0 text-zinc-400" />
        )}
        {open ? (
          <FolderOpen className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
        ) : (
          <Folder className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
        )}
        <span className="text-[12px] font-mono font-medium text-zinc-800 dark:text-zinc-200 truncate">{node.name}</span>
        {!open && hasChildren && (
          <span className="text-[10px] text-zinc-400 ml-1 shrink-0">{node.children.size}</span>
        )}
      </button>
      {open && hasChildren && (
        <div>
          {[...node.children.values()]
            .sort((a, b) => {
              // folders before files, then alpha
              if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
              return a.name.localeCompare(b.name);
            })
            .map((child) => (
              <TreeNodeView key={child.path} node={child} depth={depth + 1} defaultOpen={depth < 1} />
            ))}
        </div>
      )}
    </div>
  );
}

export interface CodeMFolderTreeProps {
  paths: string[];
  projectName?: string;
  className?: string;
}

export function CodeMFolderTree({ paths, projectName = 'project', className }: CodeMFolderTreeProps) {
  const [rootOpen, setRootOpen] = useState(true);
  const tree = buildTree(paths);

  const sorted = [...tree.values()].sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div
      className={cn(
        'rounded-lg border border-emerald-200 dark:border-emerald-900/50 overflow-hidden bg-white dark:bg-[#0a0f0d]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40">
        <FolderOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
          Project structure
        </span>
        <span className="ml-auto text-[10px] text-zinc-400">{paths.length} files</span>
      </div>

      {/* Tree body */}
      <div className="py-1.5 max-h-72 overflow-y-auto">
        {/* Root folder */}
        <button
          type="button"
          className="w-full flex items-center gap-1 py-0.5 px-2 hover:bg-emerald-500/10 rounded text-left"
          onClick={() => setRootOpen((v) => !v)}
        >
          {rootOpen ? (
            <ChevronDown className="w-3 h-3 shrink-0 text-zinc-400" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0 text-zinc-400" />
          )}
          {rootOpen ? (
            <FolderOpen className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
          ) : (
            <Folder className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
          )}
          <span className="text-[12px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">{projectName}/</span>
        </button>

        {rootOpen && (
          <div className="pl-2">
            {sorted.map((node) => (
              <TreeNodeView key={node.path} node={node} depth={1} defaultOpen={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
