/**
 * @layer domain
 * @unit skill-quality
 * @work-item-id WI-212, WI-241
 */
import type { SectionName } from '../types/section-name.js';
import type { SkillKind } from '../types/skill-kind.js';

const REQUIRED_SECTIONS: readonly SectionName[] = Object.freeze([
  'frontmatter',
  'languageMetadata',
  'purpose',
  'inputs',
  'outputs',
  'prerequisites',
  'executionFlow',
]);

const ADVISORY_REQUIRED_SECTIONS: readonly SectionName[] = Object.freeze([
  'frontmatter',
  'languageMetadata',
  'purpose',
]);

export class SkillStructure {
  readonly requiredSections: readonly SectionName[];

  private constructor(requiredSections: readonly SectionName[]) {
    this.requiredSections = requiredSections;
    Object.freeze(this);
  }

  private static _instances: Partial<Record<SkillKind, SkillStructure>> = {};

  static forKind(kind: SkillKind): SkillStructure {
    const cached = SkillStructure._instances[kind];
    if (cached) {
      return cached;
    }

    const requiredSections = kind === 'advisory' ? ADVISORY_REQUIRED_SECTIONS : REQUIRED_SECTIONS;
    const instance = new SkillStructure(requiredSections);
    SkillStructure._instances[kind] = instance;
    return instance;
  }

  static default(): SkillStructure {
    return SkillStructure.forKind('lifecycle');
  }

  getMissingSections(actualSections: readonly SectionName[]): readonly SectionName[] {
    return this.requiredSections.filter((s) => !actualSections.includes(s));
  }
}
