/**
 * @layer application
 * @unit biome-ast-engine
 */

import { UnknownRuleNameError } from '../../domain/services/rule-definition-registry.js';
import type { RuleDefinitionRegistry } from '../../domain/services/rule-definition-registry.js';
import type { RegisterRuleCatalogOutput } from '../dto/register-rule-catalog-output.js';
import { toRegisterRuleCatalogOutput } from '../mappers/register-rule-catalog-output-mapper.js';

type RuleDefinitionRegistryReader = Pick<RuleDefinitionRegistry, 'getAll'>;

export interface RegisterRuleCatalogUseCaseDeps {
  readonly ruleDefinitionRegistry: RuleDefinitionRegistryReader;
}

export class RegisterRuleCatalogUseCase {
  private readonly ruleDefinitionRegistry: RuleDefinitionRegistryReader;

  constructor(deps: RegisterRuleCatalogUseCaseDeps) {
    this.ruleDefinitionRegistry = deps.ruleDefinitionRegistry;
  }

  async execute(): Promise<Readonly<RegisterRuleCatalogOutput>> {
    const rules = this.ruleDefinitionRegistry.getAll();

    if (rules.length !== 8) {
      throw new UnknownRuleNameError(`catalog-size:${rules.length}`);
    }

    return toRegisterRuleCatalogOutput(rules);
  }
}
