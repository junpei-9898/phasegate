/**
 * @layer domain
 * @unit traceability-model
 *
 * 逆引きチェーンで使用するリンク種別
 */
export const TRACEABILITY_LINK_TYPES = Object.freeze([
  'implementation-to-unit',
  'unit-to-design',
  'design-to-story',
  'story-to-plan',
] as const);

export type TraceabilityLinkType = (typeof TRACEABILITY_LINK_TYPES)[number];
