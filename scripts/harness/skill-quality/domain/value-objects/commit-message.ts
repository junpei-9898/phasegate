/**
 * @layer domain
 * @unit skill-quality
 */
import { SkillQualityError } from '../errors/skill-quality-error.js';

export class CommitMessage {
  readonly unit: string;
  readonly storyId: string;
  readonly description: string;

  private constructor(unit: string, storyId: string, description: string) {
    this.unit = unit;
    this.storyId = storyId;
    this.description = description;
    Object.freeze(this);
  }

  static create(unit: string, storyId: string, description: string): CommitMessage {
    if (!unit || !storyId || !description) {
      throw new SkillQualityError('EMPTY_COMMIT_FIELD', 'unit, storyId, description must be non-empty');
    }
    return new CommitMessage(unit, storyId, description);
  }

  format(): string {
    return `feat(${this.unit}/${this.storyId}): ${this.description}`;
  }

  equals(other: CommitMessage): boolean {
    return this.unit === other.unit && this.storyId === other.storyId && this.description === other.description;
  }
}
