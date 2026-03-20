/**
 * @layer presentation
 * @unit config-foundation
 *
 * feature enable コマンドのハンドラー
 * --list 指定時は利用可能機能一覧を表示し、それ以外は機能を有効化する
 */
import type { FeatureToggleResult } from '../../application/dto/feature-toggle-result.js';
import type { AvailableFeatureItem } from '../../application/dto/available-feature-item.js';

export interface EnableFeatureCommandInput {
  readonly featureName?: string;
  readonly list: boolean;
  readonly configPath?: string;
}

export interface EnableFeatureCommandOutput {
  readonly exitCode: number;
  readonly output: string;
}

export interface EnableFeaturePort {
  execute(featureName: string, configPath?: string): Promise<FeatureToggleResult>;
}

export interface ListAvailableFeaturesPort {
  execute(configPath?: string): Promise<readonly AvailableFeatureItem[]>;
}

export interface EnableFeatureCommandHandlerDeps {
  readonly enableFeatureUseCase: EnableFeaturePort;
  readonly listAvailableFeaturesUseCase: ListAvailableFeaturesPort;
}

export class EnableFeatureCommandHandler {
  private readonly enableFeatureUseCase: EnableFeaturePort;
  private readonly listAvailableFeaturesUseCase: ListAvailableFeaturesPort;

  constructor(deps: EnableFeatureCommandHandlerDeps) {
    this.enableFeatureUseCase = deps.enableFeatureUseCase;
    this.listAvailableFeaturesUseCase = deps.listAvailableFeaturesUseCase;
  }

  async execute(
    input: EnableFeatureCommandInput,
  ): Promise<EnableFeatureCommandOutput> {
    try {
      if (input.list) {
        return await this.executeList(input.configPath);
      }

      if (input.featureName === undefined) {
        return {
          exitCode: 2,
          output: 'Error: feature name is required. Use --list to see available features.',
        };
      }

      return await this.executeEnable(input.featureName, input.configPath);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return { exitCode: 2, output: `Error: ${message}` };
    }
  }

  private async executeList(
    configPath?: string,
  ): Promise<EnableFeatureCommandOutput> {
    const features =
      await this.listAvailableFeaturesUseCase.execute(configPath);
    const lines: string[] = ['Available features:'];
    for (const feature of features) {
      const status = feature.enabled ? '[enabled]' : '[disabled]';
      lines.push(`  ${feature.name} ${status}`);
    }
    return { exitCode: 0, output: lines.join('\n') };
  }

  private async executeEnable(
    featureName: string,
    configPath?: string,
  ): Promise<EnableFeatureCommandOutput> {
    const result = await this.enableFeatureUseCase.execute(
      featureName,
      configPath,
    );
    return {
      exitCode: 0,
      output: `Feature "${result.feature}" enabled in ${result.configPath}`,
    };
  }
}
