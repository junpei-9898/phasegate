/**
 * @layer domain
 * @unit adr-foundation
 */
const ADR_ID_PATTERN = /^(?:ADR-)?(?<id>[0-9]{3})$/;

export class InvalidAdrIdError extends Error {
  constructor(value: string) {
    super(`ADR IDは001以上の3桁数値またはADR-001形式で指定してください: ${value}`);
    this.name = 'InvalidAdrIdError';
  }
}

export class AdrId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static create(raw: string): AdrId {
    const normalizedValue = raw.trim();
    const match = ADR_ID_PATTERN.exec(normalizedValue);

    if (!match?.groups?.id) {
      throw new InvalidAdrIdError(raw);
    }

    const value = match.groups.id;
    if (Number(value) < 1) {
      throw new InvalidAdrIdError(raw);
    }

    return new AdrId(value);
  }

  static fromAdrRef(adrRef: string): AdrId {
    return AdrId.create(adrRef);
  }

  toNumber(): number {
    return Number(this.value);
  }

  toAdrRef(): string {
    return `ADR-${this.value}`;
  }

  equals(other: AdrId): boolean {
    return this.value === other.value;
  }

  compare(other: AdrId): number {
    return this.toNumber() - other.toNumber();
  }
}
