// @unit world-model
// @layer domain
// @work-item-id WI-287
const DECLARED_KEY_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

export class InvalidDeclaredKeyError extends Error {
  constructor(value: string) {
    super(`Invalid World declared key: "${value}"`);
    this.name = "InvalidDeclaredKeyError";
  }
}

export class DeclaredKey {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static create(value: string): DeclaredKey {
    if (!DECLARED_KEY_PATTERN.test(value)) {
      throw new InvalidDeclaredKeyError(value);
    }
    return new DeclaredKey(value);
  }

  equals(other: DeclaredKey): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
