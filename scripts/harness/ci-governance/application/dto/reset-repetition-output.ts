/**
 * @layer application
 * @unit ci-governance
 */

export interface ResetRepetitionOutput {
  readonly success: boolean;
  readonly errors: Array<{ code: string; message: string }>;
}
