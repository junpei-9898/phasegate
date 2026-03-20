export class V0TestId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static create(path: string): V0TestId {
    if (!path || path.trim().length === 0) {
      throw new Error('InvalidV0TestIdError: V0TestId path must not be empty');
    }
    return new V0TestId(path);
  }

  equals(other: V0TestId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
