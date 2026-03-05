/**
 * Parse full markdown response into text and code segments for Code M.
 * Preserves fenced code blocks (```lang optional) as single code segments.
 */

import type { MessageSegment } from './chat-types';

const FENCE_REGEX = /^```(\w*)\s*$/;
const FENCE_ANY = /^```\s*$/;

/**
 * Split content into segments. Prose outside fences becomes `text`;
 * each ```...``` block becomes one `code` segment with optional language/filename.
 */
export function parseCodeMResponse(content: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  const lines = content.split(/\r?\n/);
  let i = 0;
  let inBlock = false;
  let blockLang: string | undefined;
  let blockLines: string[] = [];

  while (i < lines.length) {
    const line = lines[i];
    const fenceMatch = line.match(FENCE_REGEX);
    const fenceAny = FENCE_ANY.test(line);

    if (fenceMatch || fenceAny) {
      const lang = fenceMatch ? (fenceMatch[1] || undefined) : undefined;
      if (!inBlock) {
        // Flush any pending prose
        if (blockLines.length > 0) {
          const text = blockLines.join('\n').trim();
          if (text) segments.push({ type: 'text', text });
          blockLines = [];
        }
        inBlock = true;
        blockLang = lang;
        blockLines = [];
      } else {
        // End of code block
        const code = blockLines.join('\n');
        const firstLine = blockLines[0] || '';
        const filenameMatch = firstLine.match(/^\/\/\s*([^\s/\\]+\.\w+)$/) || firstLine.match(/^#\s*([^\s#]+\.\w+)$/);
        const filename = filenameMatch ? filenameMatch[1] : undefined;
        segments.push({
          type: 'code',
          code: code.trim(),
          language: blockLang,
          filename,
        });
        inBlock = false;
        blockLines = [];
      }
      i++;
      continue;
    }

    if (inBlock) {
      blockLines.push(line);
    } else {
      blockLines.push(line);
    }
    i++;
  }

  if (inBlock && blockLines.length > 0) {
    const code = blockLines.join('\n');
    segments.push({
      type: 'code',
      code: code.trim(),
      language: blockLang,
    });
  } else if (blockLines.length > 0) {
    const text = blockLines.join('\n').trim();
    if (text) segments.push({ type: 'text', text });
  }

  return segments.length > 0 ? segments : [{ type: 'text', text: content.trim() || '' }];
}
