/**
 * @layer infrastructure
 * @unit biome-ast-engine
 */

const UNIT_COMMENT_PATTERN = /^\s*(?:\/\/|\/\*\*?\s*|\*)\s*@unit\s+(.+)/gm;

export type UnitCommentResult = {
  readonly unitNames: readonly string[];
};

/**
 * ソースコードから `// @unit {unit}` コメントを抽出する。
 * JSDoc (`/** @unit ... * /`) 形式にも対応する。
 * カンマ区切りで複数ユニットを指定でき、複数行の @unit も収集する。
 * 結果は重複除去済み。
 */
export const parseUnitComment = (sourceCode: string): UnitCommentResult => {
  const matches = sourceCode.matchAll(UNIT_COMMENT_PATTERN);
  const names: string[] = [];

  for (const match of matches) {
    const raw = match[1].replace(/\s*\*\/$/, '').trim();
    const parts = raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    names.push(...parts);
  }

  const deduplicated = [...new Set(names)];

  return { unitNames: Object.freeze(deduplicated) };
};
