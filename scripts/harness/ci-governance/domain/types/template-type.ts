/**
 * @layer domain
 * @unit ci-governance
 *
 * TemplateType補助型
 */

export type TemplateType = 'aidlc-gate' | 'consistency-check' | 'pre-commit';

export const TEMPLATE_TYPES: readonly TemplateType[] = [
  'aidlc-gate',
  'consistency-check',
  'pre-commit',
] as const;

export function isTemplateType(value: unknown): value is TemplateType {
  return TEMPLATE_TYPES.includes(value as TemplateType);
}
