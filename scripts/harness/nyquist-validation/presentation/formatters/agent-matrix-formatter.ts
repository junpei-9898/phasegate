/**
 * @layer presentation
 * @unit nyquist-validation
 */
import type { AnalyzeImpactOutput } from '../../application/dto/analyze-impact-output.js';
import type { CalculateCoverageOutput } from '../../application/dto/calculate-coverage-output.js';
import type { CheckAcCoverageGateOutput } from '../../application/dto/check-ac-coverage-gate-output.js';
import type { ValidateMatrixOutput } from '../../application/dto/validate-matrix-output.js';
import type { NyquistHarnessError } from '../../domain/services/ac-coverage-gate-policy.js';

function formatErrorDetails(errors: readonly NyquistHarnessError[]): string {
  if (errors.length === 0) {
    return 'Result: ✓ passed';
  }

  return [
    'Result: validation failed.',
    'Errors:',
    ...errors.map((error) => `- code=${error.code}; severity=${error.severity}; message=${error.message}`),
  ].join('\n');
}

export class AgentMatrixFormatter {
  formatValidation(output: ValidateMatrixOutput): string {
    return [
      'Requirement test matrix validation summary.',
      formatErrorDetails(output.errors),
      `Schema error count: ${output.schemaErrors.length}`,
      `Integrity error count: ${output.integrityErrors.length}`,
      `Validated data available: ${output.validatedData === null ? 'no' : 'yes'}`,
    ].join('\n');
  }

  formatGate(output: CheckAcCoverageGateOutput): string {
    return [
      'AC coverage gate summary.',
      formatErrorDetails(output.errors),
      `Matrix loaded: ${output.matrix === null ? 'no' : 'yes'}`,
    ].join('\n');
  }

  formatCoverage(output: CalculateCoverageOutput): string {
    const lines = [
      'AC coverage calculation summary.',
      `Coverage: ${output.ratePercent}% (${output.coveredAcCount}/${output.totalAcCount})`,
    ];

    if (output.threshold !== null && output.meetsThreshold !== null) {
      lines.push(`Threshold: ${output.threshold}%`);
      lines.push(`Threshold result: ${output.meetsThreshold ? '✓ passed' : '✗ threshold not met'}`);
    } else {
      lines.push('Threshold result: not evaluated');
    }

    if (output.uncoveredAcIds.length === 0) {
      lines.push('Uncovered ACs: none');
    } else {
      lines.push('Uncovered ACs:');
      lines.push(...output.uncoveredAcIds.map((acId) => `- ${acId}`));
    }

    return lines.join('\n');
  }

  formatImpact(output: AnalyzeImpactOutput): string {
    const lines = [
      'Impact analysis summary.',
      `Story ID: ${output.storyId}`,
      `Found: ${output.found ? 'yes' : 'no'}`,
      `Direct mapping only: ${output.directMappingOnly ? 'yes' : 'no'}`,
    ];

    if (output.directTests.length === 0) {
      lines.push('Direct tests: No tests found');
    } else {
      lines.push('Direct tests:');
      lines.push(...output.directTests.map((test) => `- type=${test.testType}; file=${test.filePath}`));
    }

    return lines.join('\n');
  }
}

// @story-id H08-07