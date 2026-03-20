/**
 * @layer domain
 * @unit harness-error
 *
 * 重大度値オブジェクト
 * "error" (rank=2) または "warning" (rank=1) のみ許容する
 */
import { InvalidSeverityError } from '../errors/invalid-severity-error.js';

const SEVERITY_RANK: Record<string, number> = {
  error: 2,
  warning: 1,
};

const VALID_SEVERITIES = new Set(['error', 'warning']);

export class Severity {
  readonly value: 'error' | 'warning';
  readonly rank: number;

  private constructor(value: 'error' | 'warning', rank: number) {
    this.value = value;
    this.rank = rank;
    // Object.freeze is called after construction in create()
  }

  static create(raw: 'error' | 'warning'): Severity {
    if (!VALID_SEVERITIES.has(raw)) {
      throw new InvalidSeverityError(raw);
    }
    const instance = new Severity(raw, SEVERITY_RANK[raw]);
    return Object.freeze(instance);
  }

  isHigherThan(other: Severity): boolean {
    return this.rank > other.rank;
  }

  equals(other: Severity): boolean {
    return this.value === other.value;
  }

  toString(): 'error' | 'warning' {
    return this.value;
  }
}
