/**
 * @layer domain
 * @unit biome-ast-engine
 */

import { RequiredInput } from './required-input.js';
import { RuleName } from './rule-name.js';
import { RuleType } from './rule-type.js';

export type RuleSeverity = 'error' | 'warning';

type RuleDefinitionProps = {
  readonly name: RuleName;
  readonly type: RuleType;
  readonly enabled: boolean;
  readonly severity: RuleSeverity;
  readonly supportsAutofix: boolean;
  readonly requiredInputs: readonly RequiredInput[];
  readonly config: Readonly<Record<string, unknown>>;
  readonly errorCode: string;
  readonly description: string;
  readonly suggestion: string;
};

const VALID_SEVERITIES = new Set<RuleSeverity>(['error', 'warning']);
const VALID_ERROR_CODES = new Set([
  'L1-001',
  'L1-002',
  'L1-003',
  'L1-004',
  'L1-005',
  'L1-006',
  'L1-007',
  'L1-008',
]);

export class RuleDefinition {
  readonly name: RuleName;
  readonly type: RuleType;
  readonly enabled: boolean;
  readonly severity: RuleSeverity;
  readonly supportsAutofix: boolean;
  readonly requiredInputs: readonly RequiredInput[];
  readonly config: Readonly<Record<string, unknown>>;
  readonly errorCode: string;
  readonly description: string;
  readonly suggestion: string;

  private constructor(props: RuleDefinitionProps) {
    this.name = props.name;
    this.type = props.type;
    this.enabled = props.enabled;
    this.severity = props.severity;
    this.supportsAutofix = props.supportsAutofix;
    this.requiredInputs = props.requiredInputs;
    this.config = props.config;
    this.errorCode = props.errorCode;
    this.description = props.description;
    this.suggestion = props.suggestion;
  }

  static create(props: RuleDefinitionProps): RuleDefinition {
    if (!VALID_SEVERITIES.has(props.severity)) {
      throw new Error(`Invalid rule severity: ${props.severity}`);
    }

    if (!VALID_ERROR_CODES.has(props.errorCode)) {
      throw new Error(`Invalid rule error code: ${props.errorCode}`);
    }

    return Object.freeze(
      new RuleDefinition({
        ...props,
        requiredInputs: Object.freeze([...props.requiredInputs]),
        config: Object.freeze({ ...props.config }),
      })
    );
  }

  usesInput(input: RequiredInput): boolean {
    return this.requiredInputs.some((requiredInput) => requiredInput.equals(input));
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  withSeverity(severity: RuleSeverity): RuleDefinition {
    return RuleDefinition.create({
      name: this.name,
      type: this.type,
      enabled: this.enabled,
      severity,
      supportsAutofix: this.supportsAutofix,
      requiredInputs: this.requiredInputs,
      config: this.config,
      errorCode: this.errorCode,
      description: this.description,
      suggestion: this.suggestion,
    });
  }

  disable(): RuleDefinition {
    return RuleDefinition.create({
      name: this.name,
      type: this.type,
      enabled: false,
      severity: this.severity,
      supportsAutofix: this.supportsAutofix,
      requiredInputs: this.requiredInputs,
      config: this.config,
      errorCode: this.errorCode,
      description: this.description,
      suggestion: this.suggestion,
    });
  }

  equals(other: RuleDefinition): boolean {
    return (
      this.name.equals(other.name) &&
      this.type.equals(other.type) &&
      this.enabled === other.enabled &&
      this.severity === other.severity &&
      this.supportsAutofix === other.supportsAutofix &&
      this.errorCode === other.errorCode &&
      this.description === other.description &&
      this.suggestion === other.suggestion &&
      this.requiredInputs.length === other.requiredInputs.length &&
      this.requiredInputs.every((input, index) => input.equals(other.requiredInputs[index])) &&
      JSON.stringify(this.config) === JSON.stringify(other.config)
    );
  }
}
