/**
 * @layer domain
 * @unit validator-system
 * @work-item-id WI-116 / WI-156
 *
 * ValidatorId 値オブジェクト
 * L1-001〜L4-006 のバリデータを識別する不変値オブジェクト
 * Wave 2A で L1-017, L1-018, L2-013 を追加
 * WI-140 で L2-014 を追加
 * WI-132/WI-133/WI-136/WI-137/WI-138 で L2-015 を追加
 * WI-156 で L4-006 を追加
 * WI-222 (HF2-05) で L4-007（ac-level-traceability, default-OFF advisory）を追加
 * WI-227 (H16-03) で L3-005（ac-bound-coverage, default-OFF fail-closed）を追加
 * WI-258 (ADR-030 §Decision.3.②) で L2-016（coverage-attestation-gating, fail-closed）を追加
 */

export class InvalidValidatorIdError extends Error {
  readonly invalidValue: string;
  constructor(raw: string) {
    super(`Invalid validator ID: "${raw}". Must be one of the registered valid IDs.`);
    this.name = "InvalidValidatorIdError";
    this.invalidValue = raw;
  }
}

const VALIDATOR_ID_PATTERN = /^L[0-4]-\d{3}$/;

/** バリデータID -> バリデータ名のマップ */
const VALIDATOR_NAME_MAP: Record<string, string> = {
  "L1-017": "it-test-mock-detection",
  "L1-018": "stub-comment-detection",
  "L2-001": "phase-gate",
  "L2-002": "metadata",
  "L2-003": "test-quality",
  "L2-013": "cli-e2e-test-existence",
  "L2-014": "work-item-status-staleness",
  "L2-015": "contract-traceability-coverage",
  "L2-016": "coverage-attestation-gating",
  "L3-001": "security",
  "L3-002": "performance",
  "L3-003": "coverage",
  "L3-004": "nyquist",
  "L3-005": "ac-bound-coverage",
  "L4-001": "drift-detect",
  "L4-002": "consistency-check",
  "L4-003": "dead-code",
  "L4-004": "doc-freshness",
  "L4-005": "pointer-validation",
  "L4-006": "skill-catalog-drift",
  "L4-007": "ac-level-traceability",
};

/** バリデータ名 -> バリデータID の逆引きマップ */
const NAME_TO_ID_MAP: Record<string, string> = {
  ...Object.fromEntries(Object.entries(VALIDATOR_NAME_MAP).map(([id, name]) => [name, id])),
  "drift-detector": "L4-001",
  "consistency-checker": "L4-002",
  "dead-code-detector": "L4-003",
  "doc-freshness-checker": "L4-004",
  "pointer-validator": "L4-005",
  "skill-catalog-drift": "L4-006",
  "ac-level-traceability": "L4-007",
};

/** 有効なValidatorID集合 */
const VALID_IDS = new Set(Object.keys(VALIDATOR_NAME_MAP));

export class ValidatorId {
  readonly value: string;
  readonly layer: "L0" | "L1" | "L2" | "L3" | "L4";
  readonly sequence: string;

  private constructor(value: string) {
    this.value = value;
    this.layer = value.substring(0, 2) as "L0" | "L1" | "L2" | "L3" | "L4";
    this.sequence = value.substring(3);
    Object.freeze(this);
  }

  static create(raw: string): ValidatorId {
    if (!VALIDATOR_ID_PATTERN.test(raw)) {
      throw new InvalidValidatorIdError(raw);
    }
    if (!VALID_IDS.has(raw)) {
      throw new InvalidValidatorIdError(raw);
    }
    return new ValidatorId(raw);
  }

  static fromName(name: string): ValidatorId {
    const id = NAME_TO_ID_MAP[name];
    if (!id) {
      throw new InvalidValidatorIdError(name);
    }
    return new ValidatorId(id);
  }

  getLayer(): "L0" | "L1" | "L2" | "L3" | "L4" {
    return this.layer;
  }

  getName(): string {
    return VALIDATOR_NAME_MAP[this.value];
  }

  toString(): string {
    return this.value;
  }

  equals(other: ValidatorId): boolean {
    return this.value === other.value;
  }
}
