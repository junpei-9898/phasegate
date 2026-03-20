/**
 * @layer domain
 * @unit skill-quality
 */
import type { RequirementCoverageResult } from './requirement-coverage-result.js';
import type { CodeCoverageResult } from './code-coverage-result.js';
import { SkillQualityError } from '../errors/skill-quality-error.js';

export class CoverageReport {
  readonly requirementCoverage: RequirementCoverageResult;
  readonly codeCoverage: CodeCoverageResult;

  private constructor(requirementCoverage: RequirementCoverageResult, codeCoverage: CodeCoverageResult) {
    this.requirementCoverage = requirementCoverage;
    this.codeCoverage = codeCoverage;
    Object.freeze(this);
  }

  static create(requirementCoverage: RequirementCoverageResult, codeCoverage: CodeCoverageResult): CoverageReport {
    if (requirementCoverage == null || codeCoverage == null) {
      throw new SkillQualityError('INVALID_COVERAGE_REPORT', 'requirementCoverage and codeCoverage must be non-null');
    }
    return new CoverageReport(requirementCoverage, codeCoverage);
  }

  meetsThreshold(requirementThreshold: number, codeThreshold: number): boolean {
    return this.requirementCoverage.coverageRate >= requirementThreshold &&
      this.codeCoverage.lineCoverage >= codeThreshold;
  }

  equals(other: CoverageReport): boolean {
    return this.requirementCoverage.total === other.requirementCoverage.total &&
      this.requirementCoverage.covered === other.requirementCoverage.covered &&
      this.codeCoverage.equals(other.codeCoverage);
  }
}
