/**
 * @layer domain
 * @unit skill-quality
 */
import { SkillQualityError } from '../errors/skill-quality-error.js';

export interface LoopAttemptProps {
  attemptNumber: number;
  coverageRate: number;
  gaps: readonly string[];
  revision: string;
}

export class LoopAttempt {
  readonly attemptNumber: number;
  readonly coverageRate: number;
  readonly gaps: readonly string[];
  readonly revision: string;

  private constructor(props: LoopAttemptProps) {
    this.attemptNumber = props.attemptNumber;
    this.coverageRate = props.coverageRate;
    this.gaps = props.gaps;
    this.revision = props.revision;
    Object.freeze(this);
  }

  static create(props: LoopAttemptProps): LoopAttempt {
    if (props.attemptNumber < 1 || props.coverageRate < 0 || props.coverageRate > 100) {
      throw new SkillQualityError('INVALID_LOOP_ATTEMPT', 'Invalid loop attempt values');
    }
    return new LoopAttempt(props);
  }

  isPassed(): boolean {
    return this.gaps.length === 0;
  }
}
