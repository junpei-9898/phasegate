// @unit biome-ast-engine
// @layer infrastructure

const DEFAULT_LAYER_TAG = '@layer';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createLayerCommentPattern = (tagName: string): RegExp =>
  new RegExp(`^\\s*(?:\\/\\/|\\/\\*\\*?\\s*|\\*)\\s*${escapeRegExp(tagName)}\\s+(\\S+)`, 'm');

export type LayerCommentResult = {
  readonly layerName: string | null;
};

export const parseLayerComment = (
  sourceCode: string,
  tagName: string = DEFAULT_LAYER_TAG
): LayerCommentResult => {
  const match = sourceCode.match(createLayerCommentPattern(tagName));

  if (!match) {
    return { layerName: null };
  }

  const raw = match[1].replace(/\s*\*\/$/, '');

  return { layerName: raw };
};
