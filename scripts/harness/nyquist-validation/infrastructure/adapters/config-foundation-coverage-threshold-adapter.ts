/**
 * @layer infrastructure
 * @unit nyquist-validation
 *
 * CoverageThresholdPort 実装: config-foundation アダプタ
 * @stub wave2-pending
 */
import type { CoverageThresholdPort, CoverageThreshold } from '../../domain/ports/coverage-threshold-port.js';

export interface ConfigFoundationCoverageThresholdAdapterDeps {
  /** config-foundation から preset を取得するコールバック（Wave2暫定） */
  getPreset?: () => Promise<string>;
}

const THRESHOLDS: Record<string, number> = {
  minimal: 0.80,
  standard: 0.90,
  strict: 0.95,
};

export class ConfigFoundationCoverageThresholdAdapter implements CoverageThresholdPort {
  private readonly getPreset: (() => Promise<string>) | undefined;

  constructor(deps: ConfigFoundationCoverageThresholdAdapterDeps = {}) {
    this.getPreset = deps.getPreset;
  }

  async getThreshold(): Promise<CoverageThreshold> {
    let preset = 'standard';
    try {
      if (this.getPreset !== undefined) {
        preset = await this.getPreset();
      }
    } catch {
      preset = 'standard';
    }

    const active = THRESHOLDS[preset] ?? THRESHOLDS['standard'];
    return {
      standard: THRESHOLDS['standard'] ?? 0.90,
      strict: THRESHOLDS['strict'] ?? 0.95,
      active: active ?? 0.90,
    };
  }
}
