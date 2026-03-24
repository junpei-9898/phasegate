/**
 * @layer presentation
 * @unit nyquist-validation
 */
import type { AnalyzeImpactOutput, TestReferenceDto } from '../../application/dto/analyze-impact-output.js';
import type { CalculateCoverageOutput } from '../../application/dto/calculate-coverage-output.js';
import type { CheckAcCoverageGateOutput } from '../../application/dto/check-ac-coverage-gate-output.js';
import type { ValidateMatrixOutput } from '../../application/dto/validate-matrix-output.js';
import type { NyquistHarnessError } from '../../domain/services/ac-coverage-gate-policy.js';

function formatError(error: NyquistHarnessError): string {
  return `✗ ${error.code}: ${error.message}`;
}

function formatErrors(errors: readonly NyquistHarnessError[]): string {
  if (errors.length === 0) {
    return '✓ passed';
  }

  return errors.map(formatError).join('\n');
}

function formatDirectTests(directTests: readonly TestReferenceDto[]): string {
  if (directTests.length === 0) {
    return 'No tests found';
  }

  return directTests
    .map((test) => `- [${test.testType}] ${test.filePath}`)
    .join('\n');
}

export class HumanMatrixFormatter {
  formatValidation(output: ValidateMatrixOutput): string {
    return formatErrors(output.errors);
  }

  formatGate(output: CheckAcCoverageGateOutput): string {
    return formatErrors(output.errors);
  }

  formatCoverage(output: CalculateCoverageOutput): string {
    const lines = [
      `Coverage: ${output.ratePercent}% (${output.coveredAcCount}/${output.totalAcCount})`,
    ];

    if (output.threshold !== null && output.meetsThreshold !== null) {
      lines.push(output.meetsThreshold ? '✓ passed' : '✗ threshold not met');
    } else {
      lines.push('✓ passed');
    }

    if (output.uncoveredAcIds.length > 0) {
      lines.push(...output.uncoveredAcIds.map((acId) => `- ${acId}`));
    }

    return lines.join('\n');
  }

  formatImpact(output: AnalyzeImpactOutput): string {
    return [
      output.found ? '✓ passed' : '✗ STORY-NOT-FOUND: story not found',
      `Story: ${output.storyId}`,
      formatDirectTests(output.directTests),
    ].join('\n');
  }
}

// @story-id H08-07