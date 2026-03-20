/**
 * @layer infrastructure
 * @unit traceability-model
 *
 * Markdown本文から @story-id HXX-XX の独立行を抽出するパーサー
 */

export interface ParsedStoryAnnotation {
  readonly storyIdValue: string;
  readonly lineNumber: number;
  readonly contextLine: string;
  readonly standaloneLine: boolean;
}

const STORY_ID_LINE_PATTERN = /^@story-id\s+(.+)$/;
const STORY_ID_INLINE_PATTERN = /@story-id\s+(\S+)/;

/**
 * Markdown本文から @story-id 注釈を抽出する。
 * 行頭/行末空白を除去して独立行判定し、次行のコンテキストを contextLine として保持する。
 */
export function parseStoryAnnotations(
  content: string,
): readonly ParsedStoryAnnotation[] {
  const lines = content.split('\n');
  const annotations: ParsedStoryAnnotation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();
    const lineNumber = i + 1;

    const standaloneMatch = STORY_ID_LINE_PATTERN.exec(trimmedLine);
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

    const inlineMatch = STORY_ID_INLINE_PATTERN.exec(trimmedLine);
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
