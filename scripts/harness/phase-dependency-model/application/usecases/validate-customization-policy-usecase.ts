/**
 * @layer application
 * @unit phase-dependency-model
 */

import type { CustomizationValidationResultDto } from '../dto/customization-validation-result-dto.js';
import {
  CyclicPhaseDependencyError,
  NonRelaxableDependencyOverrideError,
  PhaseStructure,
} from '../../domain/models/phase-structure.js';
import type { PhaseConfigProviderPort } from '../../domain/ports/phase-config-provider-port.js';
import { InvalidCustomRuleError } from '../../domain/values/custom-rule.js';
import type { CustomRule } from '../../domain/values/custom-rule.js';

export interface ValidateCustomizationPolicyInput {}

export interface ValidateCustomizationPolicyUseCaseDeps {
  readonly phaseConfigProvider: PhaseConfigProviderPort;
}

const mapRule = (rule: CustomRule): readonly string[] =>
  Object.freeze(rule.action.map((entry) => `${entry}->${rule.targetPhase}`));

export class ValidateCustomizationPolicyUseCase {
  private readonly phaseConfigProvider: PhaseConfigProviderPort;

  constructor(deps: ValidateCustomizationPolicyUseCaseDeps) {
    this.phaseConfigProvider = deps.phaseConfigProvider;
  }

  async execute(_input: ValidateCustomizationPolicyInput): Promise<CustomizationValidationResultDto> {
    const policy = await this.phaseConfigProvider.getCustomizationPolicy();
    const warnings = policy.requestsOverride() ? ['overrideが要求されています'] : [];

    try {
      PhaseStructure.createDefault(policy);

      return Object.freeze({
        valid: true,
        errors: Object.freeze([]),
        warnings: Object.freeze([...warnings]),
        effectiveRules: Object.freeze(policy.rules.flatMap((rule) => mapRule(rule))),
      });
    } catch (error) {
      if (
        error instanceof InvalidCustomRuleError ||
        error instanceof NonRelaxableDependencyOverrideError ||
        error instanceof CyclicPhaseDependencyError
      ) {
        return Object.freeze({
          valid: false,
          errors: Object.freeze([error.message]),
          warnings: Object.freeze([...warnings]),
          effectiveRules: Object.freeze([]),
        });
      }

      throw error;
    }
  }
}
