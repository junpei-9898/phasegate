/**
 * @layer infrastructure
 * @unit agent-integration
 *
 * HarnessConfigConfigQueryAdapter
 * HarnessConfigV2 の harnesses セクションから Hook 設定を読み取る
 */

import * as fs from 'node:fs/promises';
import type { ConfigQueryPort, HookType } from '../../domain/ports/config-query-port.js';

interface HarnessesSection {
  agentLessonCollection?: boolean;
  cascadeUpdate?: boolean;
  bundleSizeLimit?: number;
  deadCodeGC?: boolean;
}

interface HarnessConfigDocument {
  harnesses?: HarnessesSection;
}

export class HarnessConfigConfigQueryAdapter implements ConfigQueryPort {
  private readonly configPath: string;
  private cachedConfig: HarnessConfigDocument | null = null;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  private async loadConfig(): Promise<HarnessConfigDocument> {
    if (this.cachedConfig !== null) {
      return this.cachedConfig;
    }
    const raw = await fs.readFile(this.configPath, 'utf8');
    const doc = JSON.parse(raw) as HarnessConfigDocument;
    this.cachedConfig = doc;
    return doc;
  }

  async isHookEnabled(hookType: HookType): Promise<boolean> {
    const config = await this.loadConfig();
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
}
