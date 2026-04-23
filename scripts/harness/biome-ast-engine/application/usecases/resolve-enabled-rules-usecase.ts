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

const FLAT_AUTO_DISABLED_RULES = Object.freeze([
  'require-unit-comment',
  'require-layer-comment',
  'no-layer-violation',
  'enforce-folder-structure',
] as const);

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
    const architecture = await this.ruleConfigProviderPort.getArchitecture();
    const overrideRules = input.overrideRules ?? {};
    const mergedRules: Record<string, 'error' | 'warning' | 'off'> = {
      ...config.rules,
      ...overrideRules,
    };

    if (architecture.preset === 'flat') {
      for (const ruleName of FLAT_AUTO_DISABLED_RULES) {
        if (!(ruleName in mergedRules)) {
          mergedRules[ruleName] = 'off';
        }
      }
    }

    const resolved = this.ruleDefinitionRegistry.resolveEnabled({
      l1Enabled: config.enabled,
      rules: mergedRules,
    });

    return toResolveEnabledRulesOutput(resolved.enabledRules, resolved.skippedRules);
  }
}
