/**
 * @layer infrastructure
 * @unit validator-system
 *
 * HarnessConfigValidatorConfigAdapter — ValidatorConfigPort実装
 * HarnessConfigV2からLayerConfig VOを構築する
 */
import { LayerConfig } from '../../domain/value-objects/layer-config.js';
import type { ValidatorConfigPort } from '../../domain/ports/validator-config-port.js';

export interface HarnessConfigLayers {
  L2?: { enabled?: boolean; validators?: string[]; strictOnly?: boolean; preset?: string };
  L3?: { enabled?: boolean; validators?: string[]; strictOnly?: boolean; preset?: string; coverageThreshold?: number; bundleSizeLimit?: number };
  L4?: { enabled?: boolean; validators?: string[]; strictOnly?: boolean; preset?: string; deadCodeGC?: boolean };
}

export interface HarnessConfigV2Like {
  preset?: 'minimal' | 'standard' | 'strict';
  project?: { preset?: 'minimal' | 'standard' | 'strict' };
  layers?: HarnessConfigLayers;
  harnesses?: {
    bundleSizeLimit?: number;
    deadCodeGC?: boolean;
  };
}

export class HarnessConfigValidatorConfigAdapter implements ValidatorConfigPort {
  private readonly config: HarnessConfigV2Like;

  constructor(config: HarnessConfigV2Like) {
    this.config = config;
  }

  async getLayerConfig(layer: 'L2' | 'L3' | 'L4'): Promise<LayerConfig> {
    const preset = (this.config.project?.preset ?? this.config.preset ?? 'standard') as 'minimal' | 'standard' | 'strict';
    const strictOnly = preset === 'strict';
    const layerData = this.config.layers?.[layer] ?? {};

    const defaultValidators: Record<string, string[]> = {
      L2: ['L2-001', 'L2-002', 'L2-003'],
      L3: ['L3-001', 'L3-002', 'L3-003', 'L3-004'],
      L4: ['L4-001', 'L4-002', 'L4-003'],
    };

    const thresholds: Record<string, number> = {};

    if (layer === 'L3') {
      const l3 = this.config.layers?.L3;
      if (l3?.coverageThreshold !== undefined) thresholds.coverageThreshold = l3.coverageThreshold;
      if (l3?.bundleSizeLimit !== undefined) thresholds.bundleSizeLimit = l3.bundleSizeLimit;
      if (this.config.harnesses?.bundleSizeLimit !== undefined) {
        thresholds.bundleSizeLimit = this.config.harnesses.bundleSizeLimit;
      }
    }

    if (layer === 'L4') {
      if (this.config.harnesses?.deadCodeGC !== undefined) {
        thresholds.deadCodeGC = this.config.harnesses.deadCodeGC ? 1 : 0;
      }
    }

    return LayerConfig.create({
      layer,
      enabled: layerData.enabled !== false,
      validatorIds: layerData.validators ?? defaultValidators[layer],
      thresholds,
      strictOnly: layerData.strictOnly ?? strictOnly,
      preset,
    });
  }
}
