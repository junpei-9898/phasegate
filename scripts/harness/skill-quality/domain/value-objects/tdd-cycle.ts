/**
 * @layer domain
 * @unit skill-quality
 */
import type { TddPhase } from '../types/tdd-phase.js';

export class TddCycle {
  readonly phase: TddPhase;
  readonly passed: boolean;

  private constructor(phase: TddPhase, passed: boolean) {
    this.phase = phase;
    this.passed = passed;
    Object.freeze(this);
  }

  static create(phase: TddPhase, passed: boolean): TddCycle {
    return new TddCycle(phase, passed);
  }

  isReadyForCommit(): boolean {
    return this.phase === 'REFACTOR' && this.passed === true;
  }

  equals(other: TddCycle): boolean {
    return this.phase === other.phase && this.passed === other.passed;
  }
}
