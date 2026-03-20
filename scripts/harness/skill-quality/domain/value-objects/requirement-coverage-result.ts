/**
 * @layer domain
 * @unit skill-quality
 */
import { SkillQualityError } from '../errors/skill-quality-error.js';

export class RequirementCoverageResult {
  readonly total: number;
  readonly covered: number;
  readonly uncoveredIds: readonly string[];

  private constructor(total: number, covered: number, uncoveredIds: readonly string[]) {
    this.total = total;
    this.covered = covered;
    this.uncoveredIds = uncoveredIds;
    Object.freeze(this);
  }

  static create(total: number, covered: number, uncoveredIds: readonly string[]): RequirementCoverageResult {
    if (total < 0 || covered < 0 || covered > total || uncoveredIds.length !== total - covered) {
      throw new SkillQualityError('INVALID_REQUIREMENT_COVERAGE', 'Invalid requirement coverage values');
    }
    return new RequirementCoverageResult(total, covered, uncoveredIds);
  }

  get coverageRate(): number {
    return this.total === 0 ? 100 : (this.covered / this.total) * 100;
  }
}
