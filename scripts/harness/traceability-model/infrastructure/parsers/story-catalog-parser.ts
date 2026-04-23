/**
 * @layer infrastructure
 * @unit traceability-model
 *
 * docs/product/user_stories.md から正規StoryId一覧と旧US対応表を抽出するパーサー
 */

export interface ParsedStoryCatalog {
  readonly storyIds: readonly string[];
  readonly aliasMap: ReadonlyMap<string, string>;
}

const STORY_ID_LINE_PATTERN = /\bH(?:F\d+|[0-9]{2})-[0-9]{2}\b/g;
const TABLE_ALIAS_PATTERN =
  /\|\s*(H[0-9]{2}-[0-9]{2})\s*\|.*?\|\s*(US-[0-9]{3})\s*\|/g;
const INLINE_ALIAS_PATTERN =
  /(H[0-9]{2}-[0-9]{2}).*?旧US\s*[:：]\s*(US-[0-9]{3})/g;

function execAll(pattern: RegExp, text: string): RegExpExecArray[] {
  const results: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  // Reset lastIndex to ensure clean iteration
  pattern.lastIndex = 0;
  while ((match = pattern.exec(text)) !== null) {
    results.push(match);
  }
  return results;
}

/**
 * Markdown文書からStoryId一覧とレガシーエイリアスマップを抽出する。
 * 表形式・見出し形式の両方に対応する。
 */
export function parseStoryCatalog(content: string): ParsedStoryCatalog {
  const storyIdSet = new Set<string>();
  const aliasMap = new Map<string, string>();

  // 正規StoryIdを収集
  const lines = content.split('\n');
  for (const line of lines) {
    const matches = execAll(STORY_ID_LINE_PATTERN, line);
    for (let j = 0; j < matches.length; j++) {
      storyIdSet.add(matches[j][0]);
    }
  }

  // テーブル形式: | H03-01 | ... | US-001 |
  const tableMatches = execAll(TABLE_ALIAS_PATTERN, content);
  for (let i = 0; i < tableMatches.length; i++) {
    aliasMap.set(tableMatches[i][2], tableMatches[i][1]);
  }

  // インライン形式: H03-01 ... 旧US: US-001
  const inlineMatches = execAll(INLINE_ALIAS_PATTERN, content);
  for (let i = 0; i < inlineMatches.length; i++) {
    aliasMap.set(inlineMatches[i][2], inlineMatches[i][1]);
  }

  // 前後行コンテキスト形式: H03-01 の直後に 旧US: US-001
  for (let i = 0; i < lines.length; i++) {
    const storyIdMatch = /\b(H(?:F\d+|[0-9]{2})-[0-9]{2})\b/.exec(lines[i]);
    if (storyIdMatch) {
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      const legacyMatch = /旧US\s*[:：]\s*(US-[0-9]{3})/.exec(nextLine);
      if (legacyMatch) {
        aliasMap.set(legacyMatch[1], storyIdMatch[1]);
      }
    }
  }

  const storyIds: string[] = [];
  storyIdSet.forEach((id) => storyIds.push(id));

  return {
    storyIds: Object.freeze(storyIds),
    aliasMap,
  };
}
