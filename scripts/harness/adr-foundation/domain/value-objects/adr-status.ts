/**
 * @layer domain
 * @unit adr-foundation
 */
const ALLOWED_STATUSES = ['Proposed', 'Accepted', 'Deprecated', 'Superseded'] as const;
type AdrStatusValue = (typeof ALLOWED_STATUSES)[number];

const TRANSITIONS: Readonly<Record<AdrStatusValue, readonly AdrStatusValue[]>> = Object.freeze({
  Proposed: Object.freeze(['Accepted', 'Deprecated']),
  Accepted: Object.freeze(['Deprecated', 'Superseded']),
  Deprecated: Object.freeze(['Proposed']),
  Superseded: Object.freeze([]),
});

export class InvalidAdrStatusError extends Error {
  constructor(value: string) {
    super(`ADR statusはProposed/Accepted/Deprecated/Supersededのいずれかで指定してください: ${value}`);
    this.name = 'InvalidAdrStatusError';
  }
}

export class AdrStatus {
  readonly value: AdrStatusValue;

  private constructor(value: AdrStatusValue) {
    this.value = value;
    Object.freeze(this);
  }

  static create(raw: string): AdrStatus {
    if (!ALLOWED_STATUSES.includes(raw as AdrStatusValue)) {
      throw new InvalidAdrStatusError(raw);
    }

    return new AdrStatus(raw as AdrStatusValue);
  }

  static proposed(): AdrStatus {
    return AdrStatus.create('Proposed');
  }

  static accepted(): AdrStatus {
    return AdrStatus.create('Accepted');
  }

  static deprecated(): AdrStatus {
    return AdrStatus.create('Deprecated');
  }

  static superseded(): AdrStatus {
    return AdrStatus.create('Superseded');
  }

  canTransitionTo(target: AdrStatus): boolean {
    return TRANSITIONS[this.value].includes(target.value);
  }

  equals(other: AdrStatus): boolean {
    return this.value === other.value;
  }

  isSuperseded(): boolean {
    return this.value === 'Superseded';
  }
}
