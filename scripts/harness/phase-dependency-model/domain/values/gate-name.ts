/**
 * @layer domain
 * @unit phase-dependency-model
 */

const GATE_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

export class InvalidGateNameError extends Error {
  constructor(value: string) {
    super(`GateNameが不正です: ${value}`);
    this.name = 'InvalidGateNameError';
  }
}

export class GateName {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static create(value: string): GateName {
    const normalizedValue = value.trim();

    if (
      normalizedValue.length === 0 ||
      !GATE_NAME_PATTERN.test(normalizedValue) ||
      normalizedValue.endsWith('-')
    ) {
      throw new InvalidGateNameError(value);
    }

    return new GateName(normalizedValue);
  }

  equals(other: GateName): boolean {
    return this.value === other.value;
  }
}
