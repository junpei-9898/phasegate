/**
 * @layer domain
 * @unit validator-system
 *
 * ValidatorDefinition 値オブジェクト
 * 個々のバリデータの不変定義を保持する
 */
import type { ValidatorId } from './validator-id.js';
import type { ValidationRule } from './validation-rule.js';

export interface ValidatorDefinitionProps {
  readonly validatorId: ValidatorId;
  readonly layer: 'L2' | 'L3' | 'L4';
  readonly name?: string;
  readonly description?: string;
  readonly rules: readonly ValidationRule[];
  readonly enabledCondition: 'always' | 'layerEnabled' | 'strictOnly';
  readonly externalPolicyRef: string | null;
  readonly executionPhase?: 'pre-commit' | 'ci' | 'scheduled';
}

const LAYER_TO_PHASE: Record<'L2' | 'L3' | 'L4', 'pre-commit' | 'ci' | 'scheduled'> = {
  L2: 'pre-commit',
  L3: 'ci',
  L4: 'scheduled',
};

export class ValidatorDefinition {
  readonly validatorId: ValidatorId;
  readonly layer: 'L2' | 'L3' | 'L4';
  readonly name: string;
  readonly description: string;
  readonly rules: readonly ValidationRule[];
  readonly enabledCondition: 'always' | 'layerEnabled' | 'strictOnly';
  readonly externalPolicyRef: string | null;
  readonly executionPhase: 'pre-commit' | 'ci' | 'scheduled';

  private constructor(props: ValidatorDefinitionProps) {
    this.validatorId = props.validatorId;
    this.layer = props.layer;
    this.name = props.name ?? props.validatorId.getName();
    this.description = props.description ?? '';
    this.rules = Object.freeze([...props.rules]);
    this.enabledCondition = props.enabledCondition;
    this.externalPolicyRef = props.externalPolicyRef;
    this.executionPhase = props.executionPhase ?? LAYER_TO_PHASE[props.layer];
    Object.freeze(this);
  }

  static create(props: ValidatorDefinitionProps): ValidatorDefinition {
    if (props.rules.length === 0) {
      throw new Error(`ValidatorDefinition requires at least one rule (validatorId: ${props.validatorId.value})`);
    }
    if (props.validatorId.getLayer() !== props.layer) {
      throw new Error(
        `ValidatorDefinition layer mismatch: validatorId layer is "${props.validatorId.getLayer()}" but layer field is "${props.layer}"`
      );
    }
    return new ValidatorDefinition(props);
  }

  requiresExternalPolicy(): boolean {
    return this.externalPolicyRef !== null;
  }

  isStrictOnly(): boolean {
    return this.enabledCondition === 'strictOnly';
  }

  equals(other: ValidatorDefinition): boolean {
    return this.validatorId.equals(other.validatorId);
  }
}
