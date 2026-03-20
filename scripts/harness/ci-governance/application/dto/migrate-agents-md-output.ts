/**
 * @layer application
 * @unit ci-governance
 */

export interface MigrateAgentsMdOutput {
  readonly success: boolean;
  readonly addedPointers: number;
  readonly linesBefore: number | null;
  readonly linesAfter: number | null;
  readonly kpiMet: boolean | null;
  readonly errors: Array<{ code: string; message: string }>;
}
