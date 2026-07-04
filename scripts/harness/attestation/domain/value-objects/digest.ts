// @unit attestation
// @layer domain

/**
 * `sha256:<64 lowercase hex>` に適合しない digest を拒否する例外。
 * errorCode: L1-050（横断決定事項 §3 / logical_design §2.4）
 */
export class InvalidDigestError extends Error {
  readonly errorCode = "L1-050";

  constructor(raw: string) {
    super(`Invalid digest: "${raw}". Must match sha256:<64 lowercase hex chars> [L1-050]`);
    this.name = "InvalidDigestError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * content-addressed self-digest を表す値オブジェクト。
 * attestation Unit がローカルに所有する（domain_model §1 所有判断 — cross-unit coupling 回避）。
 * INV-7: すべての Digest は `sha256:` prefix + 64桁 hex に適合する。
 */
export class Digest {
  private static readonly PATTERN = /^sha256:[0-9a-f]{64}$/;

  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static create(raw: string): Digest {
    if (!Digest.PATTERN.test(raw)) {
      throw new InvalidDigestError(raw);
    }
    return new Digest(raw);
  }

  static fromSha256Hex(hex: string): Digest {
    return Digest.create(`sha256:${hex}`);
  }

  equals(other: Digest): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
