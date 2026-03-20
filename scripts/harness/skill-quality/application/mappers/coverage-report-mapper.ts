/**
 * @layer application
 * @unit skill-quality
 */
import type { CoverageReport } from '../../domain/value-objects/coverage-report.js';

export interface CoverageReportDto {
  readonly requirementCoverage: {
    readonly total: number;
    readonly covered: number;
    readonly coverageRate: number;
    readonly uncoveredIds: readonly string[];
  };
  readonly codeCoverage: {
    readonly lineCoverage: number;
    readonly branchCoverage: number;
    readonly functionCoverage: number;
  };
}

export class CoverageReportMapper {
  static toDto(report: CoverageReport): CoverageReportDto {
    return {
      requirementCoverage: {
        total: report.requirementCoverage.total,
        covered: report.requirementCoverage.covered,
        coverageRate: report.requirementCoverage.coverageRate,
        uncoveredIds: report.requirementCoverage.uncoveredIds,
      },
      codeCoverage: {
        lineCoverage: report.codeCoverage.lineCoverage,
        branchCoverage: report.codeCoverage.branchCoverage,
        functionCoverage: report.codeCoverage.functionCoverage,
      },
    };
  }
}
