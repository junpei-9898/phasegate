/**
 * @layer application
 * @unit biome-ast-engine
 */

import type { VerifyEslintRemovalOutput } from '../dto/verify-eslint-removal-output.js';

export const toVerifyEslintRemovalOutput = (
  configFiles: readonly string[],
  packageDependencies: readonly string[]
): Readonly<VerifyEslintRemovalOutput> =>
  Object.freeze({
    configFiles: Object.freeze([...configFiles]),
    packageDependencies: Object.freeze([...packageDependencies]),
    hasLegacyArtifacts: configFiles.length > 0 || packageDependencies.length > 0,
  });
