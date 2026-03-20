/**
 * @layer application
 * @unit ci-governance
 */

export interface RenderCiTemplateOutput {
  readonly outputPath: string;
  readonly content: string;
  readonly errors: Array<{ code: string; message: string }>;
}
