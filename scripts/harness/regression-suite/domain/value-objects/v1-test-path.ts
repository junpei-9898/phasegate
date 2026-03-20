export class V1TestPath {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static create(path: string): V1TestPath {
    if (!path || path.trim().length === 0) {
      throw new Error('InvalidV1TestPathError: V1TestPath must not be empty');
    }
    return new V1TestPath(path);
  }

  equals(other: V1TestPath): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
