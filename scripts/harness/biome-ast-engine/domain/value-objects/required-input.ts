/**
 * @layer domain
 * @unit biome-ast-engine
 */

export type RequiredInputValue =
  | 'source-module-snapshots'
  | 'import-graph'
  | 'biome-diagnostics'
  | 'workspace-inventory';

const VALID_REQUIRED_INPUTS = new Set<RequiredInputValue>([
  'source-module-snapshots',
  'import-graph',
  'biome-diagnostics',
  'workspace-inventory',
]);

export class InvalidRequiredInputError extends Error {
  constructor(value: string) {
    super(`Invalid RequiredInput: ${value}`);
    this.name = 'InvalidRequiredInputError';
  }
}

export class RequiredInput {
  readonly value: RequiredInputValue;

  private constructor(value: RequiredInputValue) {
    this.value = value;
  }

  static fromString(value: string): RequiredInput {
    if (!VALID_REQUIRED_INPUTS.has(value as RequiredInputValue)) {
      throw new InvalidRequiredInputError(value);
    }

    return Object.freeze(new RequiredInput(value as RequiredInputValue));
  }

  equals(other: RequiredInput): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
