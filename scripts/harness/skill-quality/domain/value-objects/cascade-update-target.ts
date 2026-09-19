/**
 * @layer domain
 * @unit skill-quality
 * @work-item-id WI-220
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
    const storyIdTag = `@${/^WI-\d+$/.test(storyId) ? 'work-item-id' : 'story-id'} ${storyId}`;
    return new CascadeUpdateTarget(filePath, storyIdTag);
  }

  equals(other: CascadeUpdateTarget): boolean {
    return this.filePath === other.filePath && this.storyIdTag === other.storyIdTag;
  }

  renderAnnotation(filePath: string): string {
    return /\.(?:[cm]?[jt]s|[jt]sx)$/i.test(filePath) ? `// ${this.storyIdTag}` : this.storyIdTag;
  }

  hasAnnotationIn(content: string): boolean {
    const storyId = this.storyIdTag.slice(this.storyIdTag.indexOf(' ') + 1);
    for (const match of content.matchAll(/@(?:story-id|issue-id|work-item-id)[ \t]+([^\r\n]+)/g)) {
      const ids = match[1].replace(/-->.*$/, '').split(/[\s,]+/);
      if (ids.includes(storyId)) return true;
    }
    return false;
  }
}
