/**
 * @layer infrastructure
 * @unit biome-ast-engine
 */

const UNIT_COMMENT_PATTERN = /^\s*(?:\/\/|\/\*\*?\s*|\*)\s*@unit\s+(\S+)/m;

export type UnitCommentResult = {
  readonly unitName: string | null;
};

/**
 * ソースコードから `// @unit {unit}` コメントを抽出する。
 * JSDoc (`/** @unit ... * /`) 形式にも対応する。
 */
export const parseUnitComment = (sourceCode: string): UnitCommentResult => {
  const match = sourceCode.match(UNIT_COMMENT_PATTERN);

  if (!match) {
    return { unitName: null };
  }

  const raw = match[1].replace(/\s*\*\/$/, '');

  return { unitName: raw };
};
