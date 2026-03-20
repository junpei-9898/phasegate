/**
 * @layer domain
 * @unit biome-ast-engine
 */

export interface WorkspaceInventoryPort {
  findLegacyEslintArtifacts(): Promise<{
    configFiles: readonly string[];
    packageDependencies: readonly string[];
  }>;
}
