// @unit world-model
// @layer domain
// @work-item-id WI-287
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;

export class InvalidSha256DigestError extends Error {
  constructor(value: string) {
    super(`Invalid World SHA-256 digest: "${value}"`);
    this.name = "InvalidSha256DigestError";
  }
}

export class Sha256Digest {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static create(value: string): Sha256Digest {
    if (!SHA256_PATTERN.test(value)) {
      throw new InvalidSha256DigestError(value);
    }
    return new Sha256Digest(value);
  }

  static fromHex(hex: string): Sha256Digest {
    return Sha256Digest.create(`sha256:${hex}`);
  }

  equals(other: Sha256Digest): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
