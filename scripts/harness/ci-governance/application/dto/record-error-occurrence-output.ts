/**
 * @layer application
 * @unit ci-governance
 */

export interface RecordErrorOccurrenceOutput {
  readonly currentCount: number;
  readonly escalated: boolean;
  readonly escalationAction: { logLevel: string; messageTemplate: string } | null;
}
