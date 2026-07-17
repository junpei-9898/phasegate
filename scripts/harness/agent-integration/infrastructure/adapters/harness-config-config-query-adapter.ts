/**
 * @layer infrastructure
 * @unit agent-integration
 *
 * HarnessConfigConfigQueryAdapter
 * HarnessConfigV2 の harnesses セクションから Hook 設定を読み取る
 */

import * as fs from "node:fs";
import type { BaselineConfig, ConfigQueryPort, HookType } from "../../domain/ports/config-query-port.js";
import { ProjectPaths } from "../../domain/value-objects/project-paths.js";

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
  patterns?: string[];
  exclude?: string[];
}

interface QuickModeSection {
  relaxedGates?: string[];
}

interface BaselineSection {
  enabled?: boolean;
  path?: string;
}

interface AgentIntegrationStopHookSection {
  enforce?: boolean;
}

interface AgentIntegrationSection {
  stopHook?: AgentIntegrationStopHookSection;
}

interface HarnessConfigDocument {
  paths?: {
    designDocs?: string;
    inceptionDocs?: string;
    principlesDocs?: string;
    folderRulesDoc?: string;
  };
  harnesses?: HarnessesSection;
  project?: ProjectSection;
  protectedFiles?: ProtectedFilesSection;
  quickMode?: QuickModeSection;
  baseline?: BaselineSection;
  agentIntegration?: AgentIntegrationSection;
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
    // GitHub #40: config が JSON として壊れている場合に hook プロセス全体を throw で
    // 落とすと、エージェントの全ツール呼び出しが遮断され config の修復自体が不能になる。
    // main.ts の ConfigPersistenceError と同じ意味論（警告 + 既定値で続行）に揃える。
    // ファイル不在等の fs エラーは既存契約どおり throw する（上流の catch が defaults を
    // 適用する）。gated スコープへの書き込みは phase-gate 側が fail-closed でブロックする。
    const raw = fs.readFileSync(this.configPath, "utf8");
    let doc: HarnessConfigDocument;
    try {
      doc = JSON.parse(raw) as HarnessConfigDocument;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(
        `Warning: phasegate.config.json could not be parsed as JSON (${message}); continuing with default hook settings so self-repair stays possible.\n`,
      );
      doc = {};
    }
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
    if (hookType === "pre-tool-use") {
      return harnesses.agentLessonCollection ?? true;
    }
    if (hookType === "post-tool-use") {
      return harnesses.cascadeUpdate ?? true;
    }
    // stop はデフォルト有効
    return true;
  }

  async getProtectedFilePatterns(): Promise<string[]> {
    const config = this.loadConfig();
    const configured = config.protectedFiles?.patterns ?? [];
    const principlesDocs = config.paths?.principlesDocs ?? "docs/principles";
    const folderRulesDoc = config.paths?.folderRulesDoc ?? "docs/folder_management_rules.md";
    return [...configured, `${normalizeProjectPath(principlesDocs)}/**`, normalizeProjectPath(folderRulesDoc)];
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
    const topLevelPaths = config.paths;

    return ProjectPaths.create(paths?.source ?? ["scripts/harness"], {
      construction: paths?.docs?.construction ?? topLevelPaths?.designDocs ?? "docs/product/construction",
      inception: paths?.docs?.inception ?? topLevelPaths?.inceptionDocs ?? "docs/inception",
    });
  }

  async getBaselineConfig(): Promise<BaselineConfig> {
    const config = this.loadConfig();
    const baseline = config.baseline ?? {};
    return {
      enabled: baseline.enabled ?? true,
      path: baseline.path ?? ".phasegate/baseline.json",
    };
  }

  async getStopHookEnforce(): Promise<boolean> {
    const config = this.loadConfig();
    const enforce = config.agentIntegration?.stopHook?.enforce;
    // type guard: boolean 以外（schema validator ですり抜ける null/undefined を含む）は false にフォールバック
    return enforce === true;
  }
}

function normalizeProjectPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/g, "");
}
