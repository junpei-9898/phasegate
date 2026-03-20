/**
 * @layer application
 * @unit biome-ast-engine
 */

export type VerifyEslintRemovalOutput = {
  readonly configFiles: readonly string[];
  readonly packageDependencies: readonly string[];
  readonly hasLegacyArtifacts: boolean;
};
