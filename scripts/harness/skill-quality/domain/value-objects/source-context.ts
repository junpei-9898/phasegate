/**
 * @layer domain
 * @unit skill-quality
 */
import { SkillQualityError } from '../errors/skill-quality-error.js';

export class SourceContext {
  readonly description: string;

  private constructor(description: string) {
    this.description = description;
    Object.freeze(this);
  }

  static create(description: string): SourceContext {
    if (!description) {
      throw new SkillQualityError('EMPTY_SOURCE_CONTEXT', 'description must be non-empty');
    }
    return new SourceContext(description);
  }

  equals(other: SourceContext): boolean {
    return this.description === other.description;
  }
}
