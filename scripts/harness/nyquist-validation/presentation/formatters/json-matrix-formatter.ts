/**
 * @layer presentation
 * @unit nyquist-validation
 */
import type { AnalyzeImpactOutput } from '../../application/dto/analyze-impact-output.js';
import type { CalculateCoverageOutput } from '../../application/dto/calculate-coverage-output.js';
import type { CheckAcCoverageGateOutput } from '../../application/dto/check-ac-coverage-gate-output.js';
import type { ValidateMatrixOutput } from '../../application/dto/validate-matrix-output.js';

export class JsonMatrixFormatter {
  formatValidation(output: ValidateMatrixOutput): string {
    return JSON.stringify(output, null, 2);
  }

  formatGate(output: CheckAcCoverageGateOutput): string {
    return JSON.stringify(output, null, 2);
  }

  formatCoverage(output: CalculateCoverageOutput): string {
    return JSON.stringify(output, null, 2);
  }

  formatImpact(output: AnalyzeImpactOutput): string {
    return JSON.stringify(output, null, 2);
  }
}

// @story-id H08-07