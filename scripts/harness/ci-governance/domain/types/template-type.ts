// @unit ci-governance
// @layer domain

export type TemplateType = 'aidlc-gate' | 'consistency-check' | 'pre-commit' | 'agent-context-refresh';

export const TEMPLATE_TYPES: readonly TemplateType[] = [
  'aidlc-gate',
  'consistency-check',
  'pre-commit',
  'agent-context-refresh',
] as const;

export function isTemplateType(value: unknown): value is TemplateType {
  return TEMPLATE_TYPES.includes(value as TemplateType);
}
