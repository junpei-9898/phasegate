/**
 * @layer domain
 * @unit ci-governance
 *
 * TriggerCondition補助型
 */

export type TriggerCondition = 'pull_request' | 'schedule' | 'pre-commit';

export const TRIGGER_CONDITIONS: readonly TriggerCondition[] = [
  'pull_request',
  'schedule',
  'pre-commit',
] as const;

export function isTriggerCondition(value: unknown): value is TriggerCondition {
  return TRIGGER_CONDITIONS.includes(value as TriggerCondition);
}
