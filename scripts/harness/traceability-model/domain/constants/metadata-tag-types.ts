/**
 * @layer domain
 * @unit traceability-model
 *
 * traceability-modelで使用する正規メタデータタグ種別
 */
export const METADATA_TAG_TYPES = Object.freeze([
  '@unit',
  '@layer',
  '@story-id',
  '@story',
] as const);

export type MetadataTagType = (typeof METADATA_TAG_TYPES)[number];
