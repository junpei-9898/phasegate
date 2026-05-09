/**
 * @layer domain
 * @unit biome-ast-engine
 */

export type ArchitecturePresetIdValue =
  | 'clean'
  | 'strict-ddd'
  | 'onion'
  | 'hexagonal'
  | 'layered'
  | 'flat'
  | 'custom';

export interface ArchitectureProviderInfo {
  readonly preset: ArchitecturePresetIdValue;
  readonly layers: readonly string[];
  readonly allowedDependencies: Readonly<Record<string, readonly string[]>>;
  readonly metadataTags?: {
    readonly unit?: string;
    readonly layer?: string;
  };
}

export interface RuleConfigProviderPort {
  getL1Config(): Promise<{
    enabled: boolean;
    rules: Record<string, 'error' | 'warning' | 'off'>;
  }>;
  getArchitecture(): Promise<ArchitectureProviderInfo>;
}
