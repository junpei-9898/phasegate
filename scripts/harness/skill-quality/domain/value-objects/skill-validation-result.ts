/**
 * @layer domain
 * @unit skill-quality
 */
import type { SectionName } from '../types/section-name.js';
import { SkillQualityError } from '../errors/skill-quality-error.js';

export class SkillValidationResult {
  readonly passed: boolean;
  readonly missingSection: readonly SectionName[];
  readonly actualSections: readonly SectionName[];

  private constructor(passed: boolean, missingSection: readonly SectionName[], actualSections: readonly SectionName[]) {
    this.passed = passed;
    this.missingSection = missingSection;
    this.actualSections = actualSections;
    Object.freeze(this);
  }

  static passed(actualSections: readonly SectionName[]): SkillValidationResult {
    return new SkillValidationResult(true, [], actualSections);
  }

  static failed(missingSection: readonly SectionName[], actualSections: readonly SectionName[]): SkillValidationResult {
    if (missingSection.length < 1) {
      throw new SkillQualityError('EMPTY_MISSING_SECTIONS', 'missingSection must have at least one entry');
    }
    return new SkillValidationResult(false, missingSection, actualSections);
  }

  equals(other: SkillValidationResult): boolean {
    if (this.passed !== other.passed) return false;
    if (this.missingSection.length !== other.missingSection.length) return false;
    if (this.actualSections.length !== other.actualSections.length) return false;
    return this.missingSection.every((s, i) => s === other.missingSection[i]) &&
      this.actualSections.every((s, i) => s === other.actualSections[i]);
  }
}
