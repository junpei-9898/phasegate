// @unit attestation
// @layer domain

import { Digest } from "./digest.js";

export type SignatureMode = "unsigned-poc" | "signed";

/**
 * 未対応 signature mode（`signed`）の生成/検証要求で送出される例外。
 * errorCode: L1-052（logical_design §2.4）
 */
export class UnsupportedSignatureModeError extends Error {
  readonly errorCode = "L1-052";

  constructor(mode: string) {
    super(`Unsupported signature mode: "${mode}" (not yet implemented) [L1-052]`);
    this.name = "UnsupportedSignatureModeError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface SignatureBlockProps {
  readonly mode: SignatureMode;
  readonly attestationDigest: Digest;
  readonly algorithm: string | null;
  readonly keyId: string | null;
  readonly value: string | null;
}

/**
 * mode discriminator を持つ署名ブロック値オブジェクト。
 * unsigned-poc は INTEGRITY のみを証明し、algorithm/keyId/value はすべて null（INV-6）。
 */
export class SignatureBlock {
  readonly mode: SignatureMode;
  readonly attestationDigest: Digest;
  readonly algorithm: string | null;
  readonly keyId: string | null;
  readonly value: string | null;

  private constructor(props: SignatureBlockProps) {
    this.mode = props.mode;
    this.attestationDigest = props.attestationDigest;
    this.algorithm = props.algorithm;
    this.keyId = props.keyId;
    this.value = props.value;
    Object.freeze(this);
  }

  static create(props: SignatureBlockProps): SignatureBlock {
    if (props.mode === "signed") {
      throw new UnsupportedSignatureModeError("signed");
    }
    if (props.mode !== "unsigned-poc") {
      throw new UnsupportedSignatureModeError(String(props.mode));
    }
    // INV-6: unsigned-poc のとき algorithm/keyId/value はすべて null
    if (props.algorithm !== null || props.keyId !== null || props.value !== null) {
      throw new UnsupportedSignatureModeError("unsigned-poc must have null algorithm/keyId/value");
    }
    if (!(props.attestationDigest instanceof Digest)) {
      throw new Error("SignatureBlock: attestationDigest must be a Digest");
    }
    return new SignatureBlock(props);
  }

  /** unsigned-poc モードのブロックを構築する（algorithm/keyId/value を null で固定）。 */
  static unsignedPoc(digest: Digest): SignatureBlock {
    return new SignatureBlock({
      mode: "unsigned-poc",
      attestationDigest: digest,
      algorithm: null,
      keyId: null,
      value: null,
    });
  }

  equals(other: SignatureBlock): boolean {
    return (
      this.mode === other.mode &&
      this.attestationDigest.equals(other.attestationDigest) &&
      this.algorithm === other.algorithm &&
      this.keyId === other.keyId &&
      this.value === other.value
    );
  }
}
