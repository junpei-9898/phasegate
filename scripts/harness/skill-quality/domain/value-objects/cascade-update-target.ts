/**
 * @layer domain
 * @unit skill-quality
 */
import { SkillQualityError } from '../errors/skill-quality-error.js';

export class CascadeUpdateTarget {
  readonly filePath: string;
  readonly storyIdTag: string;

  private constructor(filePath: string, storyIdTag: string) {
    this.filePath = filePath;
    this.storyIdTag = storyIdTag;
    Object.freeze(this);
  }

  static create(filePath: string, storyId: string): CascadeUpdateTarget {
    if (!filePath) {
      throw new SkillQualityError('EMPTY_FILE_PATH', 'filePath must be non-empty');
    }
    const storyIdTag = `@story-id ${storyId}`;
    return new CascadeUpdateTarget(filePath, storyIdTag);
  }

  equals(other: CascadeUpdateTarget): boolean {
    return this.filePath === other.filePath && this.storyIdTag === other.storyIdTag;
  }
}
