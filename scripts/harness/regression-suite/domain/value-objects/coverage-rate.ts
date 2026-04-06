// @layer domain
export class CoverageRate {
  readonly value: number;

  private constructor(value: number) {
    this.value = value;
    Object.freeze(this);
  }

  static create(value: number): CoverageRate {
    if (value < 0 || value > 100) {
      throw new Error(`InvalidCoverageRateError: CoverageRate must be between 0 and 100, got ${value}`);
    }
    return new CoverageRate(value);
  }

  meetsThreshold(threshold: number): boolean {
    return this.value >= threshold;
  }

  equals(other: CoverageRate): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return `${this.value}%`;
  }
}
