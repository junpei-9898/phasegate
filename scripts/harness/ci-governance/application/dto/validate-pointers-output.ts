/**
 * @layer application
 * @unit ci-governance
 */

export interface ValidatePointersOutput {
  readonly passed: boolean;
  readonly valid: boolean;
  readonly errors: Array<{ code: string; message: string }>;
  readonly checkedCount: number;
  readonly totalPointers: number;
  readonly deadPointers: string[];
}
