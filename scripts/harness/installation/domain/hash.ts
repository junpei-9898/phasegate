// @unit installation
// @layer domain
// @work-item-id WI-145

export class Hash {
  private static readonly PATTERN = /^sha256:[0-9a-f]{64}$/;

  readonly value: string;
  readonly algorithm = "sha256";

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static from(value: string): Hash {
    if (!Hash.PATTERN.test(value)) {
      throw new Error("Hash must match sha256:<64 lowercase hex chars>");
    }
    return new Hash(value);
  }

  equals(other: Hash): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
