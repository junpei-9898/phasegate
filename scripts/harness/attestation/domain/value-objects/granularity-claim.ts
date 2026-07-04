// @unit attestation
// @layer domain

export type GranularityLevel = "file" | "ac";

export interface GranularityClaimProps {
  readonly validator: string;
  readonly level: GranularityLevel;
  readonly claim: string;
  readonly knownLimitations: readonly string[];
}

/**
 * validator set から機械導出される検査粒度の主張を表す値オブジェクト。
 * L3-004 の file-level 制約（既知制約テキスト）を保持できる。
 */
export class GranularityClaim {
  readonly validator: string;
  readonly level: GranularityLevel;
  readonly claim: string;
  readonly knownLimitations: readonly string[];

  private constructor(props: GranularityClaimProps) {
    this.validator = props.validator;
    this.level = props.level;
    this.claim = props.claim;
    this.knownLimitations = Object.freeze([...props.knownLimitations]);
    Object.freeze(this);
  }

  static create(props: GranularityClaimProps): GranularityClaim {
    if (typeof props.validator !== "string" || props.validator.length === 0) {
      throw new Error("GranularityClaim: validator must not be empty");
    }
    if (props.level !== "file" && props.level !== "ac") {
      throw new Error(`GranularityClaim: level must be "file" or "ac", got: ${String(props.level)}`);
    }
    if (typeof props.claim !== "string") {
      throw new Error("GranularityClaim: claim must be a string");
    }
    if (!Array.isArray(props.knownLimitations)) {
      throw new Error("GranularityClaim: knownLimitations must be an array");
    }
    return new GranularityClaim(props);
  }

  equals(other: GranularityClaim): boolean {
    return (
      this.validator === other.validator &&
      this.level === other.level &&
      this.claim === other.claim &&
      this.knownLimitations.length === other.knownLimitations.length &&
      this.knownLimitations.every((v, i) => v === other.knownLimitations[i])
    );
  }
}

/**
 * validatorId → 検査粒度の静的定義。anti-laundering の中核。
 * 生成（H16-01）と検証（H16-02 再導出）で同一の粒度主張を返すため domain 定数として固定する。
 */
export interface GranularityDefinition {
  readonly validator: string;
  readonly level: GranularityLevel;
  readonly claim: string;
  readonly knownLimitations: readonly string[];
}

export const L3_004_FILE_LEVEL_KNOWN_LIMITATION =
  "L3-004 traceability is FILE-LEVEL, not per-AC — a green means each AC has >=1 referencing test FILE, " +
  "not that each AC is individually asserted";

/**
 * traceability 検査（L3-004）の静的粒度定義。
 * L3-004 が validator set に含まれる場合、level "file" と file-level known-limitation を必ず付与する。
 */
export const KNOWN_LIMITATIONS_REGISTRY: Readonly<Record<string, GranularityDefinition>> = Object.freeze({
  "L3-004": Object.freeze({
    validator: "L3-004",
    level: "file",
    claim:
      "Traceability (L3-004) verifies that every acceptance criterion is referenced by at least one " +
      "test file. This is a FILE-LEVEL guarantee.",
    knownLimitations: Object.freeze([L3_004_FILE_LEVEL_KNOWN_LIMITATION]),
  }),
});

/** traceability 検査に対応する validatorId。 */
export const TRACEABILITY_VALIDATOR_ID = "L3-004";
