/**
 * @layer domain
 * @unit validator-system
 *
 * ValidatorId 値オブジェクト
 * L2-001〜L4-003 の10バリデータを識別する不変値オブジェクト
 */

export class InvalidValidatorIdError extends Error {
  readonly invalidValue: string;
  constructor(raw: string) {
    super(`Invalid validator ID: "${raw}". Must be one of the 10 valid IDs (L2-001..L2-003, L3-001..L3-004, L4-001..L4-003).`);
    this.name = 'InvalidValidatorIdError';
    this.invalidValue = raw;
  }
}

const VALIDATOR_ID_PATTERN = /^L[2-4]-\d{3}$/;

/** バリデータID -> バリデータ名のマップ */
const VALIDATOR_NAME_MAP: Record<string, string> = {
  'L2-001': 'phase-gate',
  'L2-002': 'metadata',
  'L2-003': 'test-quality',
  'L3-001': 'security',
  'L3-002': 'performance',
  'L3-003': 'coverage',
  'L3-004': 'nyquist',
  'L4-001': 'drift-detect',
  'L4-002': 'consistency-check',
  'L4-003': 'dead-code',
};

/** バリデータ名 -> バリデータID の逆引きマップ */
const NAME_TO_ID_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(VALIDATOR_NAME_MAP).map(([id, name]) => [name, id])
);

/** 有効なValidatorID集合 */
const VALID_IDS = new Set(Object.keys(VALIDATOR_NAME_MAP));

export class ValidatorId {
  readonly value: string;
  readonly layer: 'L2' | 'L3' | 'L4';
  readonly sequence: string;

  private constructor(value: string) {
    this.value = value;
    this.layer = value.substring(0, 2) as 'L2' | 'L3' | 'L4';
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

  getLayer(): 'L2' | 'L3' | 'L4' {
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
