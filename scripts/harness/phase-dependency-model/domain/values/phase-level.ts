/**
 * @layer domain
 * @unit phase-dependency-model
 */

export type PhaseLevelValue = 1 | 2 | 3;

export class InvalidPhaseLevelError extends Error {
  constructor(value: number) {
    super(`PhaseLevelが不正です: ${value}`);
    this.name = 'InvalidPhaseLevelError';
  }
}

export class PhaseLevel {
  readonly value: PhaseLevelValue;

  private constructor(value: PhaseLevelValue) {
    this.value = value;
    Object.freeze(this);
  }

  static create(value: number): PhaseLevel {
    if (!Number.isInteger(value) || value < 1 || value > 3) {
      throw new InvalidPhaseLevelError(value);
    }

    return new PhaseLevel(value as PhaseLevelValue);
  }

  isHigherThan(other: PhaseLevel): boolean {
    return this.value > other.value;
  }

  isPrerequisiteOf(other: PhaseLevel): boolean {
    return this.value < other.value;
  }

  equals(other: PhaseLevel): boolean {
    return this.value === other.value;
  }
}
