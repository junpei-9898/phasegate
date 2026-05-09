/**
 * @layer application
 * @unit ci-governance
 */

export interface RefreshClaudeMdOutput {
  readonly success: boolean;
  readonly path: string;
  readonly changed: boolean;
  readonly applied: boolean;
  readonly preview: string;
  readonly errors: Array<{ code: string; message: string }>;
}
