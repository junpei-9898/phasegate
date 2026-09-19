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

import { readFile, stat } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';

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
import { FileSystemWorkItemDependencyCatalog, type WorkItemDependencyCatalogEntry } from '../../../phase-dependency-model/infrastructure/filesystem/file-system-work-item-dependency-catalog.js';
import { WorkItemReflectionScopeResolver } from '../../../phase-dependency-model/domain/services/work-item-reflection-scope-resolver.js';

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
  readonly agentIntegration?: { readonly preToolUse?: { readonly dependencyReflection?: string } };
  readonly phaseDependencies?: RawPhaseDependenciesSection;
  readonly reporting?: { readonly outputDir?: string };
  readonly paths?: { readonly inceptionDocs?: string; readonly designDocs?: string };
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

  /** Defaults to advisory; enforcement requires an explicit trusted configuration value. */
  async checkSessionReflection(unitId: string, workItemId: string): Promise<StoryReflectionQueryResult> {
    const unknown = (reason: string) => StoryReflectionQueryResult.skipped([
      `${workItemId}: WI依存反映は未検証です（既存sessionの許可を維持）。${reason}`,
    ]);
    try {
      const raw = JSON.parse(await readFile(this.configPath, 'utf8')) as RawConfigDocument;
      const enforce = raw.agentIntegration?.preToolUse?.dependencyReflection === 'enforce';
      const finish = (result: StoryReflectionQueryResult) => enforce ? result.withSessionEnforcement() : result;
      const incomplete = (reason: string) => enforce
        ? finish(StoryReflectionQueryResult.block([reason], [])) : unknown(reason);
      const provider = new HarnessConfigPhaseConfigProvider({
        config: {
          customization: { preset: raw.phaseDependencies?.preset, overrideEnabled: raw.phaseDependencies?.override ?? false },
          storyReflection: raw.phaseDependencies?.storyReflection,
          paths: raw.paths,
        },
        defaultOutputDir: raw.reporting?.outputDir ?? '.harness/reports',
      });
      const config = await provider.getStoryReflectionConfig();
      if (!config.enabled) return StoryReflectionQueryResult.skipped();
      // Validate explicit values before provider defaults can hide an empty root.
      for (const value of [raw.paths?.inceptionDocs, raw.paths?.designDocs]) {
        if (value !== undefined) FileSystemStoryReflectionQueryAdapter.normalizeRoot(value);
      }
      const configuredRoots = await provider.getPathRoots();
      const roots = {
        inceptionDocsRoot: FileSystemStoryReflectionQueryAdapter.normalizeRoot(configuredRoots.inceptionDocsRoot),
        designDocsRoot: FileSystemStoryReflectionQueryAdapter.normalizeRoot(configuredRoots.designDocsRoot),
      };
      const catalog = await new FileSystemWorkItemDependencyCatalog({ rootDir: this.rootDir, inceptionRoot: roots.inceptionDocsRoot }).load([workItemId]);
      const scope = new WorkItemReflectionScopeResolver().resolve(unitId, [workItemId], catalog);
      const fs = new FileSystemStoryReflectionAdapter({ rootDir: this.rootDir, inceptionRoot: roots.inceptionDocsRoot, designDocsRoot: roots.designDocsRoot });
      const checker = new StoryReflectionChecker(fs);
      if (scope.status === 'unknown') {
        const diagnostic = catalog.find(item => item.id === scope.workItemId)?.diagnostic;
        const reason = `${scope.code}: ${scope.workItemId ?? workItemId}${diagnostic ? ` (${diagnostic})` : ''}。対象description.mdのID・所属・depends_onを確認してください。`;
        if (!enforce) return unknown(reason);
        const fallback = FileSystemStoryReflectionQueryAdapter.mapResult(await checker.check(unitId, config, roots), true);
        const warnings = [...fallback.warnings, `WI依存反映は未検証です。従来のUnit範囲で検査しました。${reason}`];
        return finish(fallback.passed ? StoryReflectionQueryResult.pass(warnings) : StoryReflectionQueryResult.block([...fallback.blockers], warnings));
      }
      if (config.mappings.length === 0 && catalog.some(item => item.metadata?.type !== 'chore')) {
        return incomplete('非choreの反映先mappingが空です。storyReflection.mappingsを確認してください。');
      }
      for (const item of catalog) {
        if (item.metadata?.type === 'fix') {
          for (const unit of item.unitIds) {
            const candidates = [...new Set(config.mappings.map(mapping => mapping.resolve({ unitId: unit, storyId: item.id }, roots).product))];
            const reflected = await Promise.all(candidates.map(path => fs.fileContainsStoryAnnotation(path, item.id)));
            if (!reflected.some(Boolean)) return incomplete(`${item.id}: 関係productへの反映を確認してください。候補: ${candidates.join(', ')}。関係カテゴリをレビューし内容と@work-item-idを反映してください。`);
          }
          continue;
        }
        const missing = await this.checkSessionArtifacts(item);
        if (missing) return incomplete(missing);
      }
      const result = await checker.checkResolvedScope(scope, config, roots);
      return finish(FileSystemStoryReflectionQueryAdapter.mapResult(result, true));
    } catch (error) {
      return unknown(error instanceof Error ? error.message : String(error));
    }
  }

  private static normalizeRoot(value: unknown): string {
    if (typeof value !== 'string' || value.trim() === '') throw new Error('Invalid documentation root: expected non-empty project-relative path');
    const slashPath = value.replaceAll('\\', '/');
    if (slashPath.startsWith('/') || /^[a-zA-Z]:/.test(slashPath) || slashPath.split('/').includes('..')) {
      throw new Error(`Invalid documentation root: ${value}`);
    }
    const normalized = posix.normalize(slashPath).replace(/\/$/, '');
    if (normalized === '.') throw new Error(`Invalid documentation root: ${value}`);
    return normalized;
  }

  private async isSessionArtifactFile(relativePath: string): Promise<boolean> {
    try {
      return (await stat(join(this.rootDir, relativePath))).isFile();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT' || (error as NodeJS.ErrnoException).code === 'ENOTDIR') return false;
      throw error;
    }
  }

  private async checkSessionArtifacts(item: WorkItemDependencyCatalogEntry): Promise<string | undefined> {
    const type = item.metadata?.type;
    if (type === 'chore') return undefined;
    const directory = dirname(item.descriptionPath).replaceAll('\\', '/');
    const required = type === 'refactor' ? ['logical_design.md'] : ['logical_design.md', 'domain_model.md'];
    for (const file of required) {
      const path = `${directory}/${file}`;
      if (!(await this.isSessionArtifactFile(path))) return `${item.id}: 必要成果物を確認できません: ${path}`;
    }
    if (type === 'story' || type === 'issue') {
      const tests = await Promise.all(['unit_test_design.md', 'it_test_design.md', 'scenario_test_design.md'].map(file => this.isSessionArtifactFile(`${directory}/${file}`)));
      if (!tests.some(Boolean)) return `${item.id}: ${directory} のtest設計を確認できません。必要なテスト設計を整えてください。`;
    }
    return undefined;
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
    preserveWarnings = false,
  ): StoryReflectionQueryResult {
    const warnings = result.warnings.map(
      (w) =>
        `${w.storyId}: ${w.productPath} に @${FileSystemStoryReflectionQueryAdapter.annotationKeyFor(w.storyId)} ${w.storyId} が未反映 (optional, inception: ${w.inceptionPath})`,
    );

    if (!result.isBlocked()) {
      return StoryReflectionQueryResult.pass(preserveWarnings ? warnings : []);
    }

    const blockers = result.violations.map(
      (v) =>
        `${v.productPath} に @${FileSystemStoryReflectionQueryAdapter.annotationKeyFor(v.storyId)} ${v.storyId} が反映されていません (inception: ${v.inceptionPath})`,
    );

    return StoryReflectionQueryResult.block(blockers, warnings);
  }

  private static annotationKeyFor(storyId: string): "work-item-id" | "story-id" {
    return /^WI-\d+$/.test(storyId) ? "work-item-id" : "story-id";
  }
}
