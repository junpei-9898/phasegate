/**
 * @layer infrastructure
 * @unit biome-ast-engine
 */

const LAYER_COMMENT_PATTERN = /^\s*(?:\/\/|\/\*\*?\s*|\*)\s*@layer\s+(\S+)/m;

export type LayerCommentResult = {
  readonly layerName: string | null;
};

/**
 * ソースコードから `// @layer {layer}` コメントを抽出する。
 * JSDoc (`/** @layer ... * /`) 形式にも対応する。
 */
export const parseLayerComment = (sourceCode: string): LayerCommentResult => {
  const match = sourceCode.match(LAYER_COMMENT_PATTERN);

  if (!match) {
    return { layerName: null };
  }

  const raw = match[1].replace(/\s*\*\/$/, '');

  return { layerName: raw };
};
