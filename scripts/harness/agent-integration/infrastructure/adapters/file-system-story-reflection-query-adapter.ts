// @unit agent-integration
// @layer infrastructure
/**
 * FileSystemStoryReflectionQueryAdapter
 *
 * agent-integration ドメインの `StoryReflectionQueryPort` を、
 * phase-dependency-model 側の CheckStoryReflectionUseCase +
 * FileSystemStoryReflectionAdapter + HarnessConfigPhaseConfigProvider を
 * オーケストレートして実装するアダプタ。
 *
 * 役割:
 *   1. phasegate.config.json を読み込み、PhaseConfigSection へ正規化
 *   2. HarnessConfigPhaseConfigProvider 経由で storyReflection 設定を解決
 *   3. StoryReflectionChecker + FileSystemStoryReflectionAdapter 経由で
 *      inception → product の @story-id 反映を検証
 *   4. 結果を agent-integration の StoryReflectionQueryResult に写像
 *
 * 例外: 設定ファイルが存在しない/読めない場合は "skipped" を返し、
 *       hook 全体をブロックしない（Fail-safe）。
 */

import { readFile } from 'node:fs/promises';

import type { StoryReflectionQueryPort } from '../../domain/ports/story-reflection-query-port.js';
import { StoryReflectionQueryResult } from '../../domain/value-objects/story-reflection-query-result.js';
import { FileSystemStoryReflectionAdapter } from '../../../phase-dependency-model/infrastructure/filesystem/file-system-story-reflection-adapter.js';
import { StoryReflectionChecker } from '../../../phase-dependency-model/domain/services/story-reflection-checker.js';
import { CheckStoryReflectionUseCase } from '../../../phase-dependency-model/application/usecases/check-story-reflection-usecase.js';
import {
  HarnessConfigPhaseConfigProvider,
  type PhaseConfigSection,
  type PhasePresetInput,
  type StoryReflectionSectionInput,
} from '../../../phase-dependency-model/infrastructure/config/harness-config-phase-config-provider.js';
import type { StoryReflectionResult } from '../../../phase-dependency-model/domain/values/story-reflection-result.js';

export interface FileSystemStoryReflectionQueryAdapterDeps {
  readonly rootDir: string;
  readonly configPath: string;
}

interface RawPhaseDependenciesSection {
  readonly preset?: PhasePresetInput;
  readonly override?: boolean;
  readonly storyReflection?: StoryReflectionSectionInput;
}

interface RawConfigDocument {
  readonly phaseDependencies?: RawPhaseDependenciesSection;
  readonly reporting?: { readonly outputDir?: string };
}

export class FileSystemStoryReflectionQueryAdapter
  implements StoryReflectionQueryPort
{
  private readonly rootDir: string;
  private readonly configPath: string;

  constructor(deps: FileSystemStoryReflectionQueryAdapterDeps) {
    this.rootDir = deps.rootDir;
    this.configPath = deps.configPath;
  }

  async checkReflection(unitId: string): Promise<StoryReflectionQueryResult> {
    let raw: RawConfigDocument;
    try {
      const content = await readFile(this.configPath, 'utf8');
      raw = JSON.parse(content) as RawConfigDocument;
    } catch {
      // 設定が読めない場合は fail-safe で skipped 扱い
      return StoryReflectionQueryResult.skipped();
    }

    const phaseConfigSection: PhaseConfigSection = {
      customization: {
        preset: raw.phaseDependencies?.preset,
        overrideEnabled: raw.phaseDependencies?.override ?? false,
      },
      storyReflection: raw.phaseDependencies?.storyReflection,
      reportingOutputDir: raw.reporting?.outputDir,
    };

    const provider = new HarnessConfigPhaseConfigProvider({
      config: phaseConfigSection,
      defaultOutputDir: raw.reporting?.outputDir ?? '.harness/reports',
    });

    const config = await provider.getStoryReflectionConfig();

    if (!config.enabled) {
      return StoryReflectionQueryResult.skipped();
    }

    const fsAdapter = new FileSystemStoryReflectionAdapter({ rootDir: this.rootDir });
    const checker = new StoryReflectionChecker(fsAdapter);
    const useCase = new CheckStoryReflectionUseCase({ checker });

    const result = await useCase.execute({ unitId, config });

    return FileSystemStoryReflectionQueryAdapter.mapResult(result);
  }

  private static mapResult(
    result: StoryReflectionResult,
  ): StoryReflectionQueryResult {
    const warnings = result.warnings.map(
      (w) =>
        `${w.storyId}: ${w.productPath} に @story-id ${w.storyId} が未反映 (optional, inception: ${w.inceptionPath})`,
    );

    if (!result.isBlocked()) {
      return StoryReflectionQueryResult.pass();
    }

    const blockers = result.violations.map(
      (v) =>
        `${v.productPath} に @story-id ${v.storyId} が反映されていません (inception: ${v.inceptionPath})`,
    );

    return StoryReflectionQueryResult.block(blockers, warnings);
  }
}
