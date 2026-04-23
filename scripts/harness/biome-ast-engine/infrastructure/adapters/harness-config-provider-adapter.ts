/**
 * @layer infrastructure
 * @unit biome-ast-engine
 */

import type {
  ArchitectureProviderInfo,
  RuleConfigProviderPort,
} from '../../domain/ports/rule-config-provider-port.js';

export interface L1ConfigInput {
  readonly enabled: boolean;
  readonly rules: Record<string, 'error' | 'warning' | 'off'>;
}

export type ArchitectureConfigInput = ArchitectureProviderInfo;

const DEFAULT_L1_CONFIG: L1ConfigInput = {
  enabled: true,
  rules: {},
};

const DEFAULT_ARCHITECTURE: ArchitectureConfigInput = Object.freeze({
  preset: 'clean',
  layers: Object.freeze(['domain', 'application', 'infrastructure', 'presentation']),
  allowedDependencies: Object.freeze({
    domain: Object.freeze(['domain']),
    application: Object.freeze(['application', 'domain']),
    infrastructure: Object.freeze(['infrastructure', 'application', 'domain']),
    presentation: Object.freeze(['presentation', 'application', 'domain']),
  }),
});

/**
 * RuleConfigProviderPort の実装。
 * 外部から L1 設定と architecture 情報を注入可能。未指定時はデフォルト
 * （L1: enabled=true, rules={}、architecture: clean preset）。
 */
export class HarnessConfigProviderAdapter implements RuleConfigProviderPort {
  private readonly l1Config: L1ConfigInput;
  private readonly architecture: ArchitectureConfigInput;

  constructor(
    injectedL1Config?: L1ConfigInput,
    injectedArchitecture?: ArchitectureConfigInput,
  ) {
    this.l1Config = injectedL1Config ?? DEFAULT_L1_CONFIG;
    this.architecture = injectedArchitecture ?? DEFAULT_ARCHITECTURE;
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

  async getArchitecture(): Promise<ArchitectureProviderInfo> {
    return this.architecture;
  }
}
