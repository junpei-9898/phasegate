/**
 * @layer domain
 * @unit biome-ast-engine
 */

export type RuleNameValue =
  | 'require-unit-comment'
  | 'require-layer-comment'
  | 'no-layer-violation'
  | 'enforce-folder-structure'
  | 'no-any-abuse'
  | 'no-code-duplication'
  | 'no-ghost-file'
  | 'no-comment-flood';

const VALID_RULE_NAMES = new Set<RuleNameValue>([
  'require-unit-comment',
  'require-layer-comment',
  'no-layer-violation',
  'enforce-folder-structure',
  'no-any-abuse',
  'no-code-duplication',
  'no-ghost-file',
  'no-comment-flood',
]);

const METADATA_RULE_NAMES = new Set<RuleNameValue>([
  'require-unit-comment',
  'require-layer-comment',
]);

const IMPORT_GRAPH_RULE_NAMES = new Set<RuleNameValue>(['no-layer-violation', 'no-ghost-file']);

export class InvalidRuleNameError extends Error {
  constructor(value: string) {
    super(`Invalid RuleName: ${value}`);
    this.name = 'InvalidRuleNameError';
  }
}

export class RuleName {
  readonly value: RuleNameValue;

  private constructor(value: RuleNameValue) {
    this.value = value;
  }

  static fromString(value: string): RuleName {
    if (!VALID_RULE_NAMES.has(value as RuleNameValue)) {
      throw new InvalidRuleNameError(value);
    }

    return Object.freeze(new RuleName(value as RuleNameValue));
  }

  equals(other: RuleName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  isMetadataRule(): boolean {
    return METADATA_RULE_NAMES.has(this.value);
  }

  isImportGraphRule(): boolean {
    return IMPORT_GRAPH_RULE_NAMES.has(this.value);
  }
}
