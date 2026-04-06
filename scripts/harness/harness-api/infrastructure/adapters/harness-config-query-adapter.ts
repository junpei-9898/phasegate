// @layer infrastructure
// harness-config-query-adapter.ts — HarnessConfigQueryAdapter

import * as fs from 'node:fs/promises';
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';
import type { PresetInfo, ConfigSummary, PhaseGateSummary } from '../../domain/value-objects/harness-status-summary.js';
import type { LayerId } from '../../domain/value-objects/layer-health.js';

interface HarnessConfigJson {
  version: number;
  project: {
    name: string;
    preset: 'minimal' | 'standard' | 'strict';
  };
  paths?: {
    designDocs?: string;
    integrationTests?: string;
  };
}

const PRESET_LAYERS: Record<string, LayerId[]> = {
  minimal: ['L1'],
  standard: ['L1', 'L2', 'L3'],
  strict: ['L1', 'L2', 'L3', 'L4'],
};

export interface HarnessConfigQueryAdapterOptions {
  configPath: string;
}

export class HarnessConfigQueryAdapter implements ConfigQueryPort {
  private readonly configPath: string;
  private cachedConfig: HarnessConfigJson | null = null;

  constructor(options: HarnessConfigQueryAdapterOptions) {
    this.configPath = options.configPath;
  }

  private async readConfig(): Promise<HarnessConfigJson> {
    if (this.cachedConfig !== null) return this.cachedConfig;
    const content = await fs.readFile(this.configPath, 'utf-8');
    this.cachedConfig = JSON.parse(content) as HarnessConfigJson;
    return this.cachedConfig;
  }

  async getPresetInfo(): Promise<PresetInfo> {
    const config = await this.readConfig();
    const preset = config.project.preset;
    const enabledLayers = PRESET_LAYERS[preset] ?? ['L1', 'L2', 'L3'];
    return { name: preset, enabledLayers };
  }

  async getConfigSummary(): Promise<ConfigSummary> {
    await this.readConfig();
    const stat = await fs.stat(this.configPath);
    return {
      configPath: this.configPath,
      lastModified: stat.mtime.toISOString(),
      version: '2',
    };
  }

  async getPhaseGateSummary(): Promise<PhaseGateSummary> {
    // wave2-pending: integrate with phase-dependency-model
    return { totalStories: 0, passedStories: 0, pendingStories: 0 };
  }
}
