/**
 * @layer domain
 * @unit skill-quality
 */
import { SkillQualityError } from '../errors/skill-quality-error.js';

export class CodeCoverageResult {
  readonly lineCoverage: number;
  readonly branchCoverage: number;
  readonly functionCoverage: number;

  private constructor(lineCoverage: number, branchCoverage: number, functionCoverage: number) {
    this.lineCoverage = lineCoverage;
    this.branchCoverage = branchCoverage;
    this.functionCoverage = functionCoverage;
    Object.freeze(this);
  }

  static create(line: number, branch: number, fn: number): CodeCoverageResult {
    if (line < 0 || line > 100 || branch < 0 || branch > 100 || fn < 0 || fn > 100) {
      throw new SkillQualityError('INVALID_COVERAGE_RANGE', 'Coverage values must be between 0 and 100');
    }
    return new CodeCoverageResult(line, branch, fn);
  }

  equals(other: CodeCoverageResult): boolean {
    return this.lineCoverage === other.lineCoverage &&
      this.branchCoverage === other.branchCoverage &&
      this.functionCoverage === other.functionCoverage;
  }
}
