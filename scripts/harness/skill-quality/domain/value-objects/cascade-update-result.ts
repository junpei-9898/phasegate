/**
 * @layer domain
 * @unit skill-quality
 */
import { SkillQualityError } from '../errors/skill-quality-error.js';

export interface CascadeUpdateResultProps {
  updatedCount: number;
  appliedStoryIds: readonly string[];
  errors: readonly string[];
}

export class CascadeUpdateResult {
  readonly updatedCount: number;
  readonly appliedStoryIds: readonly string[];
  readonly errors: readonly string[];

  private constructor(props: CascadeUpdateResultProps) {
    this.updatedCount = props.updatedCount;
    this.appliedStoryIds = props.appliedStoryIds;
    this.errors = props.errors;
    Object.freeze(this);
  }

  static create(props: CascadeUpdateResultProps): CascadeUpdateResult {
    if (props.updatedCount < 0) {
      throw new SkillQualityError('INVALID_UPDATED_COUNT', 'updatedCount must be >= 0');
    }
    return new CascadeUpdateResult(props);
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }
}
