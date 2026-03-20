/**
 * @layer domain
 * @unit ci-governance
 *
 * EscalationLogLevel補助型
 */

export type EscalationLogLevel = 'warn' | 'error';

export const ESCALATION_LOG_LEVELS: readonly EscalationLogLevel[] = [
  'warn',
  'error',
] as const;

export function isEscalationLogLevel(value: unknown): value is EscalationLogLevel {
  return ESCALATION_LOG_LEVELS.includes(value as EscalationLogLevel);
}
