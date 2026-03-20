/**
 * @layer application
 * @unit ci-governance
 */

export interface CheckEscalationOutput {
  readonly exists: boolean;
  readonly currentCount: number | null;
  readonly escalated: boolean | null;
}
