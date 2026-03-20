/**
 * @layer application
 * @unit phase-dependency-model
 */

export interface PhaseGateResultDto {
  readonly passed: boolean;
  readonly targetLevel: 1 | 2 | 3;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
  readonly auditRecorded: boolean;
}
