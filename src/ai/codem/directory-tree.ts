/**
 * Build an ASCII directory tree from a list of file paths.
 * Assumes paths use forward slashes. Output is layman-friendly (e.g. for SETUP.md).
 */
export function buildDirectoryTree(paths: string[], projectName = 'project'): string {
  if (paths.length === 0) return `${projectName}/\n`;

  const sorted = [...paths].sort((a, b) => a.localeCompare(b));
  const parts = new Map<string, { children: Map<string, unknown>; isFile: boolean }>();

  function ensurePath(path: string, isFile: boolean) {
    const segments = path.split('/').filter(Boolean);
    let current = parts;
    for (let i = 0; i < segments.length; i++) {
      const name = segments[i];
      const isLast = i === segments.length - 1;
      const isFileHere = isLast && isFile;
      if (!current.has(name)) {
        current.set(name, { children: new Map(), isFile: isFileHere });
      }
      const node = current.get(name)! as { children: Map<string, unknown>; isFile: boolean };
      if (isLast) node.isFile = true;
      current = node.children as Map<string, { children: Map<string, unknown>; isFile: boolean }>;
    }
  }

  for (const path of sorted) {
    ensurePath(path, true);
  }

  const lines: string[] = [`${projectName}/`];

  function walk(
    map: Map<string, { children: Map<string, unknown>; isFile: boolean }>,
    prefix: string
  ) {
    const entries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    entries.forEach(([name, node], idx) => {
      const last = idx === entries.length - 1;
      const connector = last ? '└── ' : '├── ';
      const nextPrefix = last ? '    ' : '│   ';
      const hasChildren = node.children.size > 0;
      const displayName = hasChildren && !node.isFile ? `${name}/` : name;
      lines.push(prefix + connector + displayName);
      if (hasChildren) {
        walk(
          node.children as Map<string, { children: Map<string, unknown>; isFile: boolean }>,
          prefix + nextPrefix
        );
      }
    });
  }

  walk(parts, '');
  return lines.join('\n');
}
