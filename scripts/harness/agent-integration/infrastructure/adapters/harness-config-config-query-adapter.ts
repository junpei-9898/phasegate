/**
 * @layer infrastructure
 * @unit agent-integration
 *
 * HarnessConfigConfigQueryAdapter
 * HarnessConfigV2 の harnesses セクションから Hook 設定を読み取る
 */

import * as fs from 'node:fs';
import type {
  BaselineConfig,
  ConfigQueryPort,
  HookType,
} from '../../domain/ports/config-query-port.js';
import { ProjectPaths } from '../../domain/value-objects/project-paths.js';

interface ProjectDocsSection {
  inception?: string;
  construction?: string;
}

interface ProjectPathsSection {
  source?: string[];
  docs?: ProjectDocsSection;
}

interface ProjectSection {
  paths?: ProjectPathsSection;
}

interface HarnessesSection {
  agentLessonCollection?: boolean;
  cascadeUpdate?: boolean;
  bundleSizeLimit?: number;
  deadCodeGC?: boolean;
}

interface ProtectedFilesSection {
  exclude?: string[];
}

interface QuickModeSection {
  relaxedGates?: string[];
}

interface BaselineSection {
  enabled?: boolean;
  path?: string;
}

interface HarnessConfigDocument {
  harnesses?: HarnessesSection;
  project?: ProjectSection;
  protectedFiles?: ProtectedFilesSection;
  quickMode?: QuickModeSection;
  baseline?: BaselineSection;
}

export class HarnessConfigConfigQueryAdapter implements ConfigQueryPort {
  private readonly configPath: string;
  private cachedConfig: HarnessConfigDocument | null = null;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  private loadConfig(): HarnessConfigDocument {
    if (this.cachedConfig !== null) {
      return this.cachedConfig;
    }
    const raw = fs.readFileSync(this.configPath, 'utf8');
    const doc = JSON.parse(raw) as HarnessConfigDocument;
    this.cachedConfig = doc;
    return doc;
  }

  async isHookEnabled(hookType: HookType): Promise<boolean> {
    const config = this.loadConfig();
    const harnesses = config.harnesses ?? {};

    // Wave 2 マッピング:
    // pre-tool-use → agentLessonCollection
    // post-tool-use → cascadeUpdate
    // stop → デフォルト有効
    if (hookType === 'pre-tool-use') {
      return harnesses.agentLessonCollection ?? true;
    }
    if (hookType === 'post-tool-use') {
      return harnesses.cascadeUpdate ?? true;
    }
    // stop はデフォルト有効
    return true;
  }

  async getProtectedFilePatterns(): Promise<string[]> {
    // Wave 2 では追加カスタムパターンなし
    return [];
  }

  async getProtectedFileExclusions(): Promise<string[]> {
    const config = this.loadConfig();
    return config.protectedFiles?.exclude ?? [];
  }

  async getRelaxedGates(): Promise<readonly string[]> {
    const config = this.loadConfig();
    return config.quickMode?.relaxedGates ?? [];
  }

  getProjectPaths(): ProjectPaths {
    const config = this.loadConfig();
    const paths = config.project?.paths;

    return ProjectPaths.create(
      paths?.source ?? ['scripts/harness'],
      {
        construction: paths?.docs?.construction ?? 'docs/product/construction',
        inception: paths?.docs?.inception ?? 'docs/inception',
      },
    );
  }

  async getBaselineConfig(): Promise<BaselineConfig> {
    const config = this.loadConfig();
    const baseline = config.baseline ?? {};
    return {
      enabled: baseline.enabled ?? false,
      path: baseline.path ?? '.phasegate/baseline.json',
    };
  }
}
