/**
 * @layer infrastructure
 * @unit quick-mode
 * @work-item-id WI-140
 *
 * phasegate.config.json から QuickModeConfig を取得する Adapter
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
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

const DEFAULT_QUICK_MODE_CONFIG = {
  allowedCategories: ['bugfix', 'docs', 'test', 'config'],
  maintainedLayers: ['L1', 'L2-002', 'L2-003', 'L2-014', 'L3-001'],
  relaxedGates: ['L2-001', 'L3-002', 'L3-003', 'L3-004', 'L4'],
};

export class HarnessConfigQuickModeConfigAdapter {
  private readonly configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath ?? path.resolve(process.cwd(), 'phasegate.config.json');
  }

  async getQuickModeConfig(): Promise<QuickModeConfig> {
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

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch (err) {
      throw new HarnessConfigParseError(err instanceof Error ? err.message : String(err));
    }

    const quickMode = parsed['quickMode'] as {
      allowedCategories?: string[];
      maintainedLayers?: string[];
      relaxedGates?: string[];
      fullModeRequiredWhen?: {
        mixedCategories?: boolean;
        newDomainFile?: boolean;
        apiContractChange?: boolean;
      };
    } | undefined;

    if (!quickMode) {
      return QuickModeConfig.create(DEFAULT_QUICK_MODE_CONFIG);
    }

    return QuickModeConfig.create({
      allowedCategories: quickMode.allowedCategories ?? DEFAULT_QUICK_MODE_CONFIG.allowedCategories,
      maintainedLayers: quickMode.maintainedLayers ?? DEFAULT_QUICK_MODE_CONFIG.maintainedLayers,
      relaxedGates: quickMode.relaxedGates ?? DEFAULT_QUICK_MODE_CONFIG.relaxedGates,
      fullModeRequiredWhen: quickMode.fullModeRequiredWhen,
    });
  }
}
