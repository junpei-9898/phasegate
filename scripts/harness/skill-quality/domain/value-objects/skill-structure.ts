/**
 * @layer domain
 * @unit skill-quality
 */
import type { SectionName } from '../types/section-name.js';

const REQUIRED_SECTIONS: readonly SectionName[] = [
  'frontmatter',
  'purpose',
  'inputs',
  'outputs',
  'prerequisites',
  'executionFlow',
];

export class SkillStructure {
  readonly requiredSections: readonly SectionName[];

  private constructor(requiredSections: readonly SectionName[]) {
    this.requiredSections = requiredSections;
    Object.freeze(this);
  }

  private static _instance: SkillStructure | null = null;

  static default(): SkillStructure {
    if (!SkillStructure._instance) {
      SkillStructure._instance = new SkillStructure(REQUIRED_SECTIONS);
    }
    return SkillStructure._instance;
  }

  getMissingSections(actualSections: readonly SectionName[]): readonly SectionName[] {
    return this.requiredSections.filter((s) => !actualSections.includes(s));
  }
}
