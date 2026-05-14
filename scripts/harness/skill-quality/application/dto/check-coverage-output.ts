/**
 * @layer application
 * @unit skill-quality
 */
import type { CoverageReport } from '../../domain/value-objects/coverage-report.js';

export interface CheckCoverageOutput {
  readonly coverageReport: CoverageReport;
  readonly meetsThreshold: boolean;
  readonly requirementThreshold: number;
  readonly codeThreshold: number;
  readonly skipped?: boolean;
  readonly skipReason?: 'no-tests';
}
