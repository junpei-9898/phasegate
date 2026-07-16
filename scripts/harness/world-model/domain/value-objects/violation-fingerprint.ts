// @unit world-model
// @layer domain
// @work-item-id WI-294

const VIOLATION_FINGERPRINT_PATTERN = /^pgw:v1:violation-fingerprint:sha256:[0-9a-f]{64}$/;

export class InvalidViolationFingerprintError extends Error {
  constructor(value: string) {
    super(`Invalid World violation fingerprint: "${value}"`);
    this.name = "InvalidViolationFingerprintError";
  }
}

export class ViolationFingerprint {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static create(value: string): ViolationFingerprint {
    if (!VIOLATION_FINGERPRINT_PATTERN.test(value)) {
      throw new InvalidViolationFingerprintError(value);
    }
    return new ViolationFingerprint(value);
  }

  equals(other: ViolationFingerprint): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
