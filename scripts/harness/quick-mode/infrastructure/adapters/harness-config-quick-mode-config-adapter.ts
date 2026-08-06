/**
 * @layer infrastructure
 * @unit quick-mode
 * @work-item-id WI-140
 * @work-item-id WI-377
 *
 * phasegate.config.json から QuickModeConfig を取得する Adapter
 *
 * ADR-040: 実効値は config-foundation の防御プリセット解決を経由して決定する。
 * preset 定義（presets/*.json の quickMode）が実効値の所在であり、
 * 下の DEFAULT_QUICK_MODE_CONFIG は preset 解決不能時の fail-open 用フォールバックである。
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
  HarnessConfigResolvedDocument,
  HarnessConfigSourceDocument,
  PresetId,
} from '../../../config-foundation/domain/harness-config.js';
import { PresetResolutionService } from '../../../config-foundation/domain/services/preset-resolution-service.js';
import { PresetDefinitionStore } from '../../../config-foundation/infrastructure/preset-definition-store.js';
import { QuickModeConfig } from '../../domain/value-objects/quick-mode-config.js';

export class HarnessConfigNotFoundError extends Error {
  constructor(filePath: string) {
    super(`phasegate.config.json not found: ${filePath}`);
    this.name = 'HarnessConfigNotFoundError';
  }
}

export class HarnessConfigParseError extends Error {
  constructor(message: string) {
    super(`Failed to parse phasegate.config.json: ${message}`);
    this.name = 'HarnessConfigParseError';
  }
}

/**
 * preset 解決が使えない config（未知 preset / project 欠落 / 他セクション不正）でも
 * Quick Mode 判定を止めないためのフォールバック。ADR-038 §3-1 の fail-open 原則に従い、
 * preset 解決の導入によって新たな遮断経路を作らない。
 */
const DEFAULT_QUICK_MODE_CONFIG = {
  allowedCategories: ['bugfix', 'docs', 'test', 'config'],
  maintainedLayers: ['L1', 'L2-002', 'L2-003', 'L2-014', 'L3-001'],
  relaxedGates: ['L2-001', 'L3-002', 'L3-003', 'L3-004', 'L4'],
};

const PRESET_IDS: readonly PresetId[] = ['minimal', 'standard', 'strict'];

type RawQuickMode = HarnessConfigResolvedDocument['quickMode'];

function isPresetId(value: unknown): value is PresetId {
  return typeof value === 'string' && PRESET_IDS.includes(value as PresetId);
}

export class HarnessConfigQuickModeConfigAdapter {
  private readonly configPath: string;
  private readonly presetDefinitionStore: PresetDefinitionStore;
  private readonly presetResolutionService: PresetResolutionService;

  constructor(configPath?: string) {
    this.configPath = configPath ?? path.resolve(process.cwd(), 'phasegate.config.json');
    this.presetDefinitionStore = new PresetDefinitionStore();
    this.presetResolutionService = new PresetResolutionService();
  }

  async getQuickModeConfig(): Promise<QuickModeConfig> {
    const parsed = await this.readSourceDocument();
    const quickMode = this.resolveQuickMode(parsed);

    return QuickModeConfig.create({
      allowedCategories: quickMode?.allowedCategories ?? DEFAULT_QUICK_MODE_CONFIG.allowedCategories,
      maintainedLayers: quickMode?.maintainedLayers ?? DEFAULT_QUICK_MODE_CONFIG.maintainedLayers,
      relaxedGates: quickMode?.relaxedGates ?? DEFAULT_QUICK_MODE_CONFIG.relaxedGates,
      fullModeRequiredWhen: quickMode?.fullModeRequiredWhen,
    });
  }

  private async readSourceDocument(): Promise<Record<string, unknown>> {
    let content: string;

    try {
      content = await fs.readFile(this.configPath, 'utf8') as string;
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'ENOENT') {
        throw new HarnessConfigNotFoundError(this.configPath);
      }
      throw err;
    }

    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch (err) {
      throw new HarnessConfigParseError(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * 防御プリセット解決を経由した quickMode を返す。
   * preset が特定できない、または解決が失敗する config では raw の quickMode に縮退し、
   * 未宣言キーは呼び出し側で DEFAULT_QUICK_MODE_CONFIG に補完される。
   */
  private resolveQuickMode(parsed: Record<string, unknown>): Partial<RawQuickMode> | undefined {
    const rawQuickMode = parsed['quickMode'] as Partial<RawQuickMode> | undefined;
    const preset = (parsed['project'] as { preset?: unknown } | undefined)?.preset;

    if (!isPresetId(preset)) {
      return rawQuickMode;
    }

    try {
      const presetDefinitions = this.presetDefinitionStore.load();
      const resolved = this.presetResolutionService.resolve(
        parsed as unknown as HarnessConfigSourceDocument,
        presetDefinitions[preset],
      );
      return resolved.quickMode;
    } catch {
      return rawQuickMode;
    }
  }
}
