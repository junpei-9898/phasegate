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
  /\|\s*(H(?:F\d+|[0-9]{2})-[0-9]{2})\s*\|.*?\|\s*(US-[0-9]{3})\s*\|/g;
// 旧US ラベルは Markdown 強調（**旧US**:）で囲まれることがあるため `\**` を許容する。
const INLINE_ALIAS_PATTERN =
  /(H(?:F\d+|[0-9]{2})-[0-9]{2}).*?旧US\**\s*[:：]\s*(US-[0-9]{3})/g;

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

  // 見出しスコープ形式:
  //   ### H01-01: タイトル
  //
  //   **旧US**: US-036
  // のように、`### HXX-XX:` 見出しの後、次の見出しが現れるまでの範囲に `旧US: US-xxx`
  // が出現するパターンに対応する。旧実装は直後行（lines[i+1]）のみを見ていたため、
  // 実際の user_stories.md（見出しと旧US行の間に空行や Epic 行が挟まる）では alias が
  // 一切抽出されず、レガシー StoryId 解決が事実上機能していなかった。
  const HEADING_STORY_ID = /^#{1,6}\s+(H(?:F\d+|[0-9]{2})-[0-9]{2})\b/;
  const LEGACY_IN_LINE = /旧US\**\s*[:：]\s*(US-[0-9]{3})/;
  let currentHeadingStoryId: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const headingMatch = HEADING_STORY_ID.exec(lines[i]);
    if (headingMatch) {
      currentHeadingStoryId = headingMatch[1];
      continue;
    }
    if (/^#{1,6}\s+/.test(lines[i])) {
      // StoryId を含まない別の見出しに入ったらスコープを閉じる
      currentHeadingStoryId = null;
      continue;
    }
    if (currentHeadingStoryId) {
      const legacyMatch = LEGACY_IN_LINE.exec(lines[i]);
      if (legacyMatch && !aliasMap.has(legacyMatch[1])) {
        aliasMap.set(legacyMatch[1], currentHeadingStoryId);
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
