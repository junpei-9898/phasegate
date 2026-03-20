/**
 * @layer application
 * @unit phase2-extensions
 */
import type { HarnessErrorContract } from '../../../harness-error/application/dto/harness-error-contract.js';

export interface GenerateE2ETemplateOutput {
  templateContent: string;
  targetPhase: string;
  generatedAt: string;
  outputPath: string | null;
  errors: HarnessErrorContract[];
}
