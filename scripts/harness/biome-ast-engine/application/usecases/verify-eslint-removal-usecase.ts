/**
 * @layer application
 * @unit biome-ast-engine
 */

import type { WorkspaceInventoryPort } from '../../domain/ports/workspace-inventory-port.js';
import type { VerifyEslintRemovalInput } from '../dto/verify-eslint-removal-input.js';
import type { VerifyEslintRemovalOutput } from '../dto/verify-eslint-removal-output.js';
import { toVerifyEslintRemovalOutput } from '../mappers/verify-eslint-removal-output-mapper.js';

export class LegacyEslintArtifactDetectedError extends Error {
  readonly configFiles: readonly string[];
  readonly packageDependencies: readonly string[];

  constructor(output: VerifyEslintRemovalOutput) {
    super('legacy eslint artifacts detected');
    this.name = 'LegacyEslintArtifactDetectedError';
    this.configFiles = output.configFiles;
    this.packageDependencies = output.packageDependencies;
  }
}

export interface VerifyEslintRemovalUseCaseDeps {
  readonly workspaceInventoryPort: WorkspaceInventoryPort;
}

export class VerifyEslintRemovalUseCase {
  private readonly workspaceInventoryPort: WorkspaceInventoryPort;

  constructor(deps: VerifyEslintRemovalUseCaseDeps) {
    this.workspaceInventoryPort = deps.workspaceInventoryPort;
  }

  async execute(
    input: VerifyEslintRemovalInput = {}
  ): Promise<Readonly<VerifyEslintRemovalOutput>> {
    const artifacts = await this.workspaceInventoryPort.findLegacyEslintArtifacts();
    const output = toVerifyEslintRemovalOutput(
      artifacts.configFiles,
      artifacts.packageDependencies
    );

    if (input.failOnLegacyArtifacts === true && output.hasLegacyArtifacts) {
      throw new LegacyEslintArtifactDetectedError(output);
    }

    return output;
  }
}
