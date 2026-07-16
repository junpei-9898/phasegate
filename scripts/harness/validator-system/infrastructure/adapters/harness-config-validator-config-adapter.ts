/**
 * @layer infrastructure
 * @unit validator-system
 * @work-item-id WI-156
 * @work-item-id WI-212
 * @work-item-id WI-301
 * @work-item-id WI-302
 *
 * HarnessConfigValidatorConfigAdapter — ValidatorConfigPort実装
 * HarnessConfigV2からLayerConfig VOを構築する
 */

import type { ValidatorConfigPort } from "../../domain/ports/validator-config-port.js";
import { LayerConfig } from "../../domain/value-objects/layer-config.js";
import { ValidatorId } from "../../domain/value-objects/validator-id.js";

export interface HarnessConfigLayers {
  L2?: { enabled?: boolean; validators?: string[]; strictOnly?: boolean; preset?: string };
  L3?: {
    enabled?: boolean;
    validators?: string[];
    strictOnly?: boolean;
    preset?: string;
    coverageThreshold?: number;
    bundleSizeLimit?: number;
  };
  L4?: { enabled?: boolean; validators?: string[]; strictOnly?: boolean; preset?: string; deadCodeGC?: boolean };
}

export interface HarnessConfigV2Like {
  preset?: "minimal" | "standard" | "strict";
  project?: { preset?: "minimal" | "standard" | "strict"; languages?: readonly string[] };
  layers?: HarnessConfigLayers;
  harnesses?: {
    bundleSizeLimit?: number;
    deadCodeGC?: boolean;
  };
  world?: { enabled?: boolean };
}

export class HarnessConfigValidatorConfigAdapter implements ValidatorConfigPort {
  private readonly config: HarnessConfigV2Like;

  constructor(config: HarnessConfigV2Like) {
    this.config = config;
  }

  async getLayerConfig(layer: "L2" | "L3" | "L4"): Promise<LayerConfig> {
    const preset = (this.config.project?.preset ?? this.config.preset ?? "standard") as
      | "minimal"
      | "standard"
      | "strict";
    const strictOnly = preset === "strict";
    const layerData = this.config.layers?.[layer] ?? {};

    const defaultValidators: Record<string, string[]> = {
      L2: ["L2-001", "L2-002", "L2-003", "L2-013", "L2-014", "L2-015"],
      L3: ["L3-001", "L3-002", "L3-003", "L3-004"],
      L4: ["L4-001", "L4-002", "L4-003", "L4-004", "L4-005", "L4-006"],
    };

    const thresholds: Record<string, number> = {};

    if (layer === "L3") {
      const l3 = this.config.layers?.L3;
      if (l3?.coverageThreshold !== undefined) thresholds.coverageThreshold = l3.coverageThreshold;
      if (l3?.bundleSizeLimit !== undefined) thresholds.bundleSizeLimit = l3.bundleSizeLimit;
      if (this.config.harnesses?.bundleSizeLimit !== undefined) {
        thresholds.bundleSizeLimit = this.config.harnesses.bundleSizeLimit;
      }
    }

    if (layer === "L4") {
      if (this.config.harnesses?.deadCodeGC !== undefined) {
        thresholds.deadCodeGC = this.config.harnesses.deadCodeGC ? 1 : 0;
      }
    }

    const configuredValidatorIds = layerData.validators ?? defaultValidators[layer];
    const automaticWorldValidatorId = layer === "L2" ? "L2-017" : layer === "L3" ? "L3-008" : null;
    const selectedValidatorIds =
      automaticWorldValidatorId === null
        ? configuredValidatorIds
        : this.config.world?.enabled === true
          ? [...configuredValidatorIds, automaticWorldValidatorId]
          : configuredValidatorIds.filter((validatorId) => validatorId !== automaticWorldValidatorId);
    return LayerConfig.create({
      layer,
      enabled: layerData.enabled !== false,
      validatorIds: [...new Set(selectedValidatorIds.map((idOrName) => this.normalizeValidatorId(idOrName)))],
      thresholds,
      strictOnly: layerData.strictOnly ?? strictOnly,
      preset,
    });
  }

  async getProjectLanguages(): Promise<readonly string[]> {
    const languages = this.config.project?.languages;
    return languages && languages.length > 0 ? [...languages] : ["typescript"];
  }

  private normalizeValidatorId(idOrName: string): string {
    try {
      return ValidatorId.create(idOrName).value;
    } catch {
      return ValidatorId.fromName(idOrName).value;
    }
  }
}
