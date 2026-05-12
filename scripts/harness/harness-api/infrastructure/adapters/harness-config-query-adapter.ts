// @layer infrastructure
// @unit harness-api
// @work-item-id WI-123
// harness-config-query-adapter.ts — HarnessConfigQueryAdapter

import * as fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import type { ConfigQueryPort } from '../../domain/ports/config-query-port.js';
import type { PresetInfo, ConfigSummary, PhaseGateSummary, HookHealth, BaselineHealth } from '../../domain/value-objects/harness-status-summary.js';
import type { LayerId } from '../../domain/value-objects/layer-health.js';

interface HarnessConfigJson {
  version: number;
  project: {
    name: string;
    preset: 'minimal' | 'standard' | 'strict';
  };
  layers?: Partial<Record<LayerId, { enabled?: boolean }>>;
  paths?: {
    designDocs?: string;
    integrationTests?: string;
  };
  baseline?: {
    enabled?: boolean;
    path?: string;
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
    const presetLayers = PRESET_LAYERS[preset] ?? ['L1', 'L2', 'L3'];
    const enabledLayerSet = new Set<LayerId>(presetLayers);

    for (const [layerId, layerConfig] of Object.entries(config.layers ?? {}) as [LayerId, { enabled?: boolean }][]) {
      if (layerConfig.enabled === true) {
        enabledLayerSet.add(layerId);
      } else if (layerConfig.enabled === false) {
        enabledLayerSet.delete(layerId);
      }
    }

    const enabledLayers = (['L1', 'L2', 'L3', 'L4'] as const).filter((layerId) => enabledLayerSet.has(layerId));
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

  async getHookHealth(): Promise<HookHealth> {
    const rootDir = dirname(this.configPath);
    const configuredHooks: string[] = [];
    for (const hookPath of ['.claude/settings.json', '.codex/hooks.json', '.husky/pre-commit', '.husky/pre-push']) {
      try {
        await fs.access(join(rootDir, hookPath));
        configuredHooks.push(hookPath);
      } catch {
        // Missing hook files are represented by absence from configuredHooks.
      }
    }

    const skipEvents = await readHookSkipEvents(join(rootDir, '.phasegate/hook-skip-events.jsonl'));
    const skipCountsByReason: Record<string, number> = {};
    for (const event of skipEvents) {
      skipCountsByReason[event.reason] = (skipCountsByReason[event.reason] ?? 0) + 1;
    }

    return {
      enabled: configuredHooks.length > 0,
      configuredHooks,
      latestSkip: skipEvents.at(-1) ?? null,
      skipCountsByReason,
      applyPatchBypass: {
        nativeApplyPatchIntercepted: false,
        backstop: 'pre-commit',
        documentationUrl: 'docs/guide/codex-integration.md',
      },
    };
  }

  async getBaselineHealth(): Promise<BaselineHealth> {
    const config = await this.readConfig();
    const rootDir = dirname(this.configPath);
    const enabled = config.baseline?.enabled ?? true;
    const relativePath = config.baseline?.path ?? '.phasegate/baseline.json';
    const baselinePath = resolve(rootDir, relativePath);

    if (!enabled) {
      return { enabled: false, path: relativePath, grandfatheredFileCount: 0, shaMismatchCount: 0, missingFileCount: 0, removalRate: 0 };
    }

    let raw: string;
    try {
      raw = await fs.readFile(baselinePath, 'utf-8');
    } catch {
      return { enabled: true, path: relativePath, grandfatheredFileCount: 0, shaMismatchCount: 0, missingFileCount: 0, removalRate: 0 };
    }

    const parsed = JSON.parse(raw) as { files?: Array<{ path?: string; sha1?: string }>; entries?: Array<{ path?: string; sha1?: string }> };
    const entries = parsed.files ?? parsed.entries ?? [];
    let shaMismatchCount = 0;
    let missingFileCount = 0;
    for (const entry of entries) {
      if (typeof entry.path !== 'string' || typeof entry.sha1 !== 'string') continue;
      try {
        const current = await fs.readFile(resolve(rootDir, entry.path));
        const sha1 = createHash('sha1').update(current).digest('hex');
        if (sha1 !== entry.sha1) shaMismatchCount += 1;
      } catch {
        missingFileCount += 1;
      }
    }
    const grandfatheredFileCount = entries.length;
    const removalRate = grandfatheredFileCount === 0
      ? 1
      : (shaMismatchCount + missingFileCount) / grandfatheredFileCount;
    return { enabled: true, path: relativePath, grandfatheredFileCount, shaMismatchCount, missingFileCount, removalRate };
  }
}

async function readHookSkipEvents(filePath: string): Promise<Array<NonNullable<HookHealth['latestSkip']>>> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as HookHealth['latestSkip'])
      .filter((event): event is NonNullable<HookHealth['latestSkip']> => event !== null);
  } catch {
    return [];
  }
}
