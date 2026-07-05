/**
 * @layer application
 * @unit nyquist-validation
 *
 * CoverageResult → CalculateCoverageOutput マッパー
 */
import type { CoverageResult } from '../../domain/value-objects/coverage-result.js';
import type { CalculateCoverageOutput } from '../dto/calculate-coverage-output.js';

export function toCalculateCoverageOutput(
  result: CoverageResult,
  threshold: { active: number } | null
): CalculateCoverageOutput {
  return {
    coveredAcCount: result.coveredAcCount,
    totalAcCount: result.totalAcCount,
    ratePercent: result.toPercentage(),
    uncoveredAcIds: result.uncoveredAcIds,
    threshold: threshold?.active ?? null,
    meetsThreshold:
      threshold !== null ? result.meetsThreshold(threshold.active) : null,
  };
}
