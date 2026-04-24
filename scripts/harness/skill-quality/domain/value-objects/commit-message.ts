/**
 * @layer domain
 * @unit skill-quality
 */
import { SkillQualityError } from "../errors/skill-quality-error.js";

const WORK_ITEM_ID_PATTERN = /^WI-\d+$/;

export class CommitMessage {
  readonly unit: string;
  readonly storyId: string;
  readonly description: string;
  readonly workItemId: string | undefined;

  private constructor(unit: string, storyId: string, description: string, workItemId?: string) {
    this.unit = unit;
    this.storyId = storyId;
    this.description = description;
    this.workItemId = workItemId;
    Object.freeze(this);
  }

  static create(unit: string, storyId: string, description: string, workItemId?: string): CommitMessage {
    if (!unit || !storyId || !description) {
      throw new SkillQualityError("EMPTY_COMMIT_FIELD", "unit, storyId, description must be non-empty");
    }
    if (workItemId !== undefined && !WORK_ITEM_ID_PATTERN.test(workItemId)) {
      throw new SkillQualityError("INVALID_WORK_ITEM_ID", "workItemId must match WI-<number>");
    }
    return new CommitMessage(unit, storyId, description, workItemId);
  }

  format(): string {
    const subject = `feat(${this.unit}/${this.storyId}): ${this.description}`;
    if (this.workItemId === undefined) {
      return subject;
    }
    return `${subject}\n\nWork-Item: ${this.workItemId}`;
  }

  equals(other: CommitMessage): boolean {
    return (
      this.unit === other.unit &&
      this.storyId === other.storyId &&
      this.description === other.description &&
      this.workItemId === other.workItemId
    );
  }
}
