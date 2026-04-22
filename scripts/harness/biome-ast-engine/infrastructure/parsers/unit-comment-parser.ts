// @unit biome-ast-engine
// @layer infrastructure

// カンマ区切り複数ユニット対応 + 複数行の @unit を収集、重複除去。
const UNIT_COMMENT_PATTERN = /^\s*(?:\/\/|\/\*\*?\s*|\*)\s*@unit\s+(.+)/gm;

export type UnitCommentResult = {
  readonly unitNames: readonly string[];
};

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
