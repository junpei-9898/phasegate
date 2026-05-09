// @unit biome-ast-engine
// @layer infrastructure

// カンマ区切り複数ユニット対応 + 複数行の metadata unit tag を収集、重複除去。
const DEFAULT_UNIT_TAG = '@unit';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createUnitCommentPattern = (tagName: string): RegExp =>
  new RegExp(`^\\s*(?:\\/\\/|\\/\\*\\*?\\s*|\\*)\\s*${escapeRegExp(tagName)}\\s+(.+)`, 'gm');

export type UnitCommentResult = {
  readonly unitNames: readonly string[];
};

export const parseUnitComment = (
  sourceCode: string,
  tagName: string = DEFAULT_UNIT_TAG
): UnitCommentResult => {
  const matches = sourceCode.matchAll(createUnitCommentPattern(tagName));
  const names: string[] = [];

  for (const match of matches) {
    const raw = match[1].replace(/\s*\*\/$/, '').trim();
    const parts = raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    names.push(...parts);
  }

  const deduplicated = [...new Set(names)];

  return { unitNames: Object.freeze(deduplicated) };
};
