/**
 * @layer domain
 * @unit traceability-model
 *
 * traceability-modelで使用する正規レイヤー名
 */
export const LAYER_NAMES = Object.freeze([
  'domain',
  'application',
  'infrastructure',
  'presentation',
] as const);

export type LayerName = (typeof LAYER_NAMES)[number];
