/**
 * @layer domain
 * @unit quick-mode
 * @work-item-id WI-015
 */

import type { ChangedFile } from '../value-objects/changed-file.js';

type ScannerState = 'normal' | 'single' | 'double' | 'template' | 'lineComment' | 'blockComment';

function stripCommentsAndWhitespace(source: string): string {
  let state: ScannerState = 'normal';
  let output = '';
  let escaped = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i] ?? '';
    const next = source[i + 1] ?? '';

    if (state === 'lineComment') {
      if (char === '\n' || char === '\r') {
        state = 'normal';
      }
      continue;
    }

    if (state === 'blockComment') {
      if (char === '*' && next === '/') {
        i += 1;
        state = 'normal';
      }
      continue;
    }

    if (state === 'single' || state === 'double' || state === 'template') {
      output += char;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (
        (state === 'single' && char === "'") ||
        (state === 'double' && char === '"') ||
        (state === 'template' && char === '`')
      ) {
        state = 'normal';
      }
      continue;
    }

    if (char === '/' && next === '/') {
      state = 'lineComment';
      i += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      state = 'blockComment';
      i += 1;
      continue;
    }
    if (char === "'") {
      state = 'single';
      output += char;
      continue;
    }
    if (char === '"') {
      state = 'double';
      output += char;
      continue;
    }
    if (char === '`') {
      state = 'template';
      output += char;
      continue;
    }
    if (!/\s/.test(char)) {
      output += char;
    }
  }

  return output;
}

export function isCommentOnlyDiff(file: ChangedFile): boolean {
  if (typeof file.beforeContent !== 'string' || typeof file.afterContent !== 'string') {
    return false;
  }

  return stripCommentsAndWhitespace(file.beforeContent) === stripCommentsAndWhitespace(file.afterContent);
}
