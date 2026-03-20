/**
 * @layer domain
 * @unit biome-ast-engine
 */

export type RuleTypeValue = 'BiomeNative' | 'ExternalAnalyzer';

const VALID_RULE_TYPES = new Set<RuleTypeValue>(['BiomeNative', 'ExternalAnalyzer']);

export class InvalidRuleTypeError extends Error {
  constructor(value: string) {
    super(`Invalid RuleType: ${value}`);
    this.name = 'InvalidRuleTypeError';
  }
}

export class RuleType {
  readonly value: RuleTypeValue;

  private constructor(value: RuleTypeValue) {
    this.value = value;
  }

  static fromString(value: string): RuleType {
    if (!VALID_RULE_TYPES.has(value as RuleTypeValue)) {
      throw new InvalidRuleTypeError(value);
    }

    return Object.freeze(new RuleType(value as RuleTypeValue));
  }

  isBiomeNative(): boolean {
    return this.value === 'BiomeNative';
  }

  isExternalAnalyzer(): boolean {
    return this.value === 'ExternalAnalyzer';
  }

  equals(other: RuleType): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
