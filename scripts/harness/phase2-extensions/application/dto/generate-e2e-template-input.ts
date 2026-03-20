/**
 * @layer application
 * @unit phase2-extensions
 */
export interface GenerateE2ETemplateInput {
  targetPhase: string;
  outputPath?: string;
  format?: 'text' | 'json';
}
