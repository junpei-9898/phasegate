/**
 * @layer domain
 * @unit skill-quality
 */
import type { ValidationViolation } from '../types/validation-violation.js';
import { SkillQualityError } from '../errors/skill-quality-error.js';

export class CommitReadiness {
  readonly ready: boolean;
  readonly violations: readonly ValidationViolation[];

  private constructor(ready: boolean, violations: readonly ValidationViolation[]) {
    this.ready = ready;
    this.violations = violations;
    Object.freeze(this);
  }

  static go(): CommitReadiness {
    return new CommitReadiness(true, []);
  }

  static noGo(violations: readonly ValidationViolation[]): CommitReadiness {
    if (violations.length < 1) {
      throw new SkillQualityError('EMPTY_VIOLATIONS', 'violations must have at least one entry');
    }
    return new CommitReadiness(false, violations);
  }

  equals(other: CommitReadiness): boolean {
    if (this.ready !== other.ready) return false;
    if (this.violations.length !== other.violations.length) return false;
    return this.violations.every((v, i) => v.ruleId === other.violations[i]?.ruleId && v.message === other.violations[i]?.message);
  }
}
