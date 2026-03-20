/**
 * @layer application
 * @unit config-foundation
 */
import type { HarnessConfigV2 } from '../../domain/harness-config.js';
import type { ResolvedConfigOutput } from '../dto/resolved-config-output.js';

export interface LoadResolvedConfigUseCasePort {
  execute(configPath?: string): Promise<ResolvedConfigOutput>;
}

export interface LoadConfigFacadeDependencies {
  readonly loadResolvedConfigUseCase: LoadResolvedConfigUseCasePort;
}

export class LoadConfigFacade {
  private readonly loadResolvedConfigUseCase: LoadResolvedConfigUseCasePort;

  constructor(dependencies: LoadConfigFacadeDependencies) {
    this.loadResolvedConfigUseCase = dependencies.loadResolvedConfigUseCase;
  }

  async load(configPath?: string): Promise<HarnessConfigV2> {
    const output = await this.loadResolvedConfigUseCase.execute(configPath);

    return output.config;
  }
}
