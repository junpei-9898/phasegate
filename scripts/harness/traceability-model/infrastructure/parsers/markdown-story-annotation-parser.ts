/**
 * @layer infrastructure
 * @unit traceability-model
 *
 * Markdown本文から @story-id HXX-XX の独立行を抽出するパーサー。
 * code-span (backtick) と code-fence (``` / ~~~) 内部の @story-id は prose として扱わず無視する。
 */

export interface ParsedStoryAnnotation {
  readonly storyIdValue: string;
  readonly lineNumber: number;
  readonly contextLine: string;
  readonly standaloneLine: boolean;
}

const STORY_ID_LINE_PATTERN = /^@story-id\s+(.+)$/;
const STORY_ID_INLINE_PATTERN = /@story-id\s+(\S+)/;
const BACKTICK_FENCE_PATTERN = /^\s*```/;
const TILDE_FENCE_PATTERN = /^\s*~~~/;

type FenceChar = '`' | '~' | null;

function detectFenceChar(line: string): FenceChar {
  if (BACKTICK_FENCE_PATTERN.test(line)) return '`';
  if (TILDE_FENCE_PATTERN.test(line)) return '~';
  return null;
}

function stripCodeSpans(line: string): string {
  return line.replace(/`[^`\n]*`/g, '');
}

/**
 * Markdown本文から @story-id 注釈を抽出する。
 * 行頭/行末空白を除去して独立行判定し、次行のコンテキストを contextLine として保持する。
 * code-fence / code-span 内部の @story-id は除外する。
 */
export function parseStoryAnnotations(
  content: string,
): readonly ParsedStoryAnnotation[] {
  const lines = content.split('\n');
  const annotations: ParsedStoryAnnotation[] = [];
  let fenceChar: FenceChar = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmedLine = rawLine.trim();
    const lineNumber = i + 1;

    const detected = detectFenceChar(rawLine);
    if (fenceChar === null) {
      if (detected !== null) {
        fenceChar = detected;
      }
      if (fenceChar !== null) {
        continue;
      }
    } else {
      if (detected === fenceChar) {
        fenceChar = null;
      }
      continue;
    }

    const sanitizedLine = stripCodeSpans(trimmedLine);

    const standaloneMatch = STORY_ID_LINE_PATTERN.exec(sanitizedLine);
    if (standaloneMatch) {
      const contextLine =
        i + 1 < lines.length ? lines[i + 1].trim() : '';
      annotations.push({
        storyIdValue: standaloneMatch[1].trim(),
        lineNumber,
        contextLine,
        standaloneLine: true,
      });
      continue;
    }

    const inlineMatch = STORY_ID_INLINE_PATTERN.exec(sanitizedLine);
    if (inlineMatch) {
      const contextLine =
        i + 1 < lines.length ? lines[i + 1].trim() : '';
      annotations.push({
        storyIdValue: inlineMatch[1].trim(),
        lineNumber,
        contextLine,
        standaloneLine: false,
      });
    }
  }

  return Object.freeze([...annotations]);
}
