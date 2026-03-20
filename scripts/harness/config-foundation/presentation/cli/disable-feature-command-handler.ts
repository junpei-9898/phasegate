/**
 * @layer presentation
 * @unit config-foundation
 *
 * feature disable コマンドのハンドラー
 * --list 指定時は利用可能機能一覧を表示し、それ以外は機能を無効化する
 */
import type { FeatureToggleResult } from '../../application/dto/feature-toggle-result.js';
import type { AvailableFeatureItem } from '../../application/dto/available-feature-item.js';

export interface DisableFeatureCommandInput {
  readonly featureName?: string;
  readonly list: boolean;
  readonly configPath?: string;
}

export interface DisableFeatureCommandOutput {
  readonly exitCode: number;
  readonly output: string;
}

export interface DisableFeaturePort {
  execute(featureName: string, configPath?: string): Promise<FeatureToggleResult>;
}

export interface ListAvailableFeaturesForDisablePort {
  execute(configPath?: string): Promise<readonly AvailableFeatureItem[]>;
}

export interface DisableFeatureCommandHandlerDeps {
  readonly disableFeatureUseCase: DisableFeaturePort;
  readonly listAvailableFeaturesUseCase: ListAvailableFeaturesForDisablePort;
}

export class DisableFeatureCommandHandler {
  private readonly disableFeatureUseCase: DisableFeaturePort;
  private readonly listAvailableFeaturesUseCase: ListAvailableFeaturesForDisablePort;

  constructor(deps: DisableFeatureCommandHandlerDeps) {
    this.disableFeatureUseCase = deps.disableFeatureUseCase;
    this.listAvailableFeaturesUseCase = deps.listAvailableFeaturesUseCase;
  }

  async execute(
    input: DisableFeatureCommandInput,
  ): Promise<DisableFeatureCommandOutput> {
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

      return await this.executeDisable(input.featureName, input.configPath);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return { exitCode: 2, output: `Error: ${message}` };
    }
  }

  private async executeList(
    configPath?: string,
  ): Promise<DisableFeatureCommandOutput> {
    const features =
      await this.listAvailableFeaturesUseCase.execute(configPath);
    const lines: string[] = ['Available features:'];
    for (const feature of features) {
      const status = feature.enabled ? '[enabled]' : '[disabled]';
      lines.push(`  ${feature.name} ${status}`);
    }
    return { exitCode: 0, output: lines.join('\n') };
  }

  private async executeDisable(
    featureName: string,
    configPath?: string,
  ): Promise<DisableFeatureCommandOutput> {
    const result = await this.disableFeatureUseCase.execute(
      featureName,
      configPath,
    );
    return {
      exitCode: 0,
      output: `Feature "${result.feature}" disabled in ${result.configPath}`,
    };
  }
}
