/**
 * @layer application
 * @unit biome-ast-engine
 */

import type { RuleConfigProviderPort } from '../../domain/ports/rule-config-provider-port.js';
import type { RuleDefinitionRegistry } from '../../domain/services/rule-definition-registry.js';
import type { ResolveEnabledRulesInput } from '../dto/resolve-enabled-rules-input.js';
import type { ResolveEnabledRulesOutput } from '../dto/resolve-enabled-rules-output.js';
import { toResolveEnabledRulesOutput } from '../mappers/resolve-enabled-rules-output-mapper.js';

type RuleDefinitionResolver = Pick<RuleDefinitionRegistry, 'resolveEnabled'>;

export interface ResolveEnabledRulesUseCaseDeps {
  readonly ruleConfigProviderPort: RuleConfigProviderPort;
  readonly ruleDefinitionRegistry: RuleDefinitionResolver;
}

export class ResolveEnabledRulesUseCase {
  private readonly ruleConfigProviderPort: RuleConfigProviderPort;
  private readonly ruleDefinitionRegistry: RuleDefinitionResolver;

  constructor(deps: ResolveEnabledRulesUseCaseDeps) {
    this.ruleConfigProviderPort = deps.ruleConfigProviderPort;
    this.ruleDefinitionRegistry = deps.ruleDefinitionRegistry;
  }

  async execute(
    input: ResolveEnabledRulesInput = {}
  ): Promise<Readonly<ResolveEnabledRulesOutput>> {
    const config = await this.ruleConfigProviderPort.getL1Config();
    const mergedRules = {
      ...config.rules,
      ...(input.overrideRules ?? {}),
    };
    const resolved = this.ruleDefinitionRegistry.resolveEnabled({
      l1Enabled: config.enabled,
      rules: mergedRules,
    });

    return toResolveEnabledRulesOutput(resolved.enabledRules, resolved.skippedRules);
  }
}
