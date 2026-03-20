/**
 * @layer domain
 * @unit biome-ast-engine
 */

export interface RuleConfigProviderPort {
  getL1Config(): Promise<{
    enabled: boolean;
    rules: Record<string, 'error' | 'warning' | 'off'>;
  }>;
}
