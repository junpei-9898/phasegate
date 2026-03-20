/**
 * @layer infrastructure
 * @unit biome-ast-engine
 */

import type { RuleConfigProviderPort } from '../../domain/ports/rule-config-provider-port.js';

export interface L1ConfigInput {
  readonly enabled: boolean;
  readonly rules: Record<string, 'error' | 'warning' | 'off'>;
}

const DEFAULT_L1_CONFIG: L1ConfigInput = {
  enabled: true,
  rules: {},
};

/**
 * RuleConfigProviderPort の実装。
 * 外部から L1 設定を注入可能。未指定時はデフォルト（enabled: true, rules: {} — 全ルールデフォルト有効）。
 */
export class HarnessConfigProviderAdapter implements RuleConfigProviderPort {
  private readonly l1Config: L1ConfigInput;

  constructor(injectedL1Config?: L1ConfigInput) {
    this.l1Config = injectedL1Config ?? DEFAULT_L1_CONFIG;
  }

  async getL1Config(): Promise<{
    enabled: boolean;
    rules: Record<string, 'error' | 'warning' | 'off'>;
  }> {
    return {
      enabled: this.l1Config.enabled,
      rules: { ...this.l1Config.rules },
    };
  }
}
