/**
 * @layer infrastructure
 * @unit phase2-extensions
 */
import type { HarnessConfigV2 } from '../../../config-foundation/domain/harness-config.js';
import { InitialCreationExpirationRule } from '../../domain/aggregates/initial-creation-expiration-rule.js';
import type { InitialCreationExpirationConfigPort } from '../../domain/ports/initial-creation-expiration-config-port.js';

type Phase2InitialCreationConfig = {
  phase2Extensions?: {
    initialCreationExpirationRules?: Array<{
      ruleId: string;
      documentPattern: string;
      daysThreshold: number;
      commitCountThreshold: number;
      evaluationMode: 'or' | 'and';
      enabled?: boolean;
    }>;
  };
};

const DEFAULT_RULE_CONFIG = {
  ruleId: 'default-initial-creation-expiration',
  documentPattern: 'docs/**/*.md',
  daysThreshold: 90,
  commitCountThreshold: 5,
  evaluationMode: 'or' as const,
  enabled: true,
};

export class HarnessConfigInitialCreationExpirationAdapter
  implements InitialCreationExpirationConfigPort
{
  constructor(private readonly config?: HarnessConfigV2 | Phase2InitialCreationConfig) {}

  async loadRules(): Promise<InitialCreationExpirationRule[]> {
    const configRules =
      this.config && 'phase2Extensions' in this.config
        ? this.config.phase2Extensions?.initialCreationExpirationRules
        : undefined;

    if (!configRules || configRules.length === 0) {
      return [InitialCreationExpirationRule.create(DEFAULT_RULE_CONFIG)];
    }

    return configRules.map((rule) =>
      InitialCreationExpirationRule.create({
        ruleId: rule.ruleId,
        documentPattern: rule.documentPattern,
        daysThreshold: rule.daysThreshold,
        commitCountThreshold: rule.commitCountThreshold,
        evaluationMode: rule.evaluationMode,
        enabled: rule.enabled ?? true,
      }),
    );
  }
}
