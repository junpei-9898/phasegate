/**
 * @layer domain
 * @unit skill-quality
 *
 * PlanCheckerLoop 集約ルート
 */
import { randomUUID } from 'node:crypto';
import type { LoopStatus } from '../types/loop-status.js';
import type { LoopAttempt } from '../value-objects/loop-attempt.js';
import { SkillQualityError } from '../errors/skill-quality-error.js';

export class PlanCheckerLoop {
  readonly id: string;
  status: LoopStatus;
  readonly loopHistory: LoopAttempt[];
  readonly maxRetries: number;

  private constructor(id: string) {
    this.id = id;
    this.status = 'RUNNING';
    this.loopHistory = [];
    this.maxRetries = 3;
  }

  static create(): PlanCheckerLoop {
    return new PlanCheckerLoop(randomUUID());
  }

  addAttempt(attempt: LoopAttempt): void {
    // INV-3: check completed status (PASSED or FAILED_EXCEEDED)
    if (this.status === 'PASSED' || this.status === 'FAILED_EXCEEDED') {
      throw new SkillQualityError('LOOP_ALREADY_COMPLETED', 'Loop is already completed');
    }
    // INV-1: check history length only when still RUNNING
    if (this.loopHistory.length >= this.maxRetries) {
      throw new SkillQualityError('LOOP_MAX_RETRIES_EXCEEDED', 'Max retries exceeded');
    }
    this.loopHistory.push(attempt);

    if (attempt.gaps.length === 0) {
      this.complete();
    } else if (this.loopHistory.length === this.maxRetries) {
      this.fail();
    }
  }

  private complete(): void {
    const last = this.loopHistory[this.loopHistory.length - 1];
    if (!last || last.gaps.length > 0) {
      throw new SkillQualityError('LOOP_GAPS_NOT_EMPTY', 'Cannot complete loop with non-empty gaps');
    }
    this.status = 'PASSED';
  }

  private fail(): void {
    this.status = 'FAILED_EXCEEDED';
  }
}
