export type SuiteIdValue = 'k-requirements' | 'gng-gate' | 'v0-migration' | 'agent-independence';

const VALID_SUITE_IDS: ReadonlySet<string> = new Set([
  'k-requirements',
  'gng-gate',
  'v0-migration',
  'agent-independence',
]);

export class SuiteId {
  readonly value: SuiteIdValue;

  private constructor(value: SuiteIdValue) {
    this.value = value;
    Object.freeze(this);
  }

  static create(raw: SuiteIdValue): SuiteId {
    if (!VALID_SUITE_IDS.has(raw)) {
      throw new Error(`InvalidSuiteIdError: '${raw}' is not a valid SuiteId`);
    }
    return new SuiteId(raw);
  }

  equals(other: SuiteId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
