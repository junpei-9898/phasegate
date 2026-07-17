// @layer domain
// @unit harness-api
// harness-status-summary.ts — HarnessStatusSummary Value Object

import type { LayerHealth, LayerId } from "./layer-health.js";

export interface PhaseGateSummary {
  totalStories: number;
  passedStories: number;
  pendingStories: number;
}

export interface PresetInfo {
  name: "minimal" | "standard" | "strict";
  enabledLayers: LayerId[];
}

export interface ConfigSummary {
  configPath: string;
  lastModified: string;
  version: string;
}

/**
 * WI-328 (github#39 残課題): 実効言語リストとその出所。
 * source:
 * - 'declared' — config の project.languages 宣言
 * - 'detected' — ファイルシステムマーカーからの自動検出（WI-319）
 * - 'fallback' — 検出ゼロで typescript フォールバック
 */
export interface LanguageInfo {
  effective: readonly string[];
  source: "declared" | "detected" | "fallback";
}

export interface HookSkipState {
  hookType: string;
  reason: "HOOK_DISABLED" | "TIMEOUT_EXCEEDED" | "REENTRY_DETECTED" | string;
  targetPaths: readonly string[];
  observedAt: string;
}

export interface HookHealth {
  enabled: boolean;
  configuredHooks: readonly string[];
  latestSkip: HookSkipState | null;
  skipCountsByReason: Readonly<Record<string, number>>;
  applyPatchBypass: {
    nativeApplyPatchIntercepted: boolean;
    backstop: "pre-commit";
    documentationUrl: string;
  };
}

export interface BaselineHealth {
  enabled: boolean;
  path: string;
  grandfatheredFileCount: number;
  shaMismatchCount: number;
  missingFileCount: number;
  removalRate: number;
}

export interface OperationalWarning {
  code: string;
  message: string;
  nextAction: string;
}

export interface HarnessStatusSummaryProps {
  layers: readonly LayerHealth[];
  phaseGateSummary: PhaseGateSummary;
  presetInfo: PresetInfo;
  configSummary: ConfigSummary;
  languages?: LanguageInfo;
  hookHealth?: HookHealth;
  baselineHealth?: BaselineHealth;
  operationalWarnings?: readonly OperationalWarning[];
}

const REQUIRED_LAYER_IDS: readonly LayerId[] = ["L1", "L2", "L3", "L4"];

export class HarnessStatusSummary {
  readonly layers: readonly LayerHealth[];
  readonly phaseGateSummary: PhaseGateSummary;
  readonly presetInfo: PresetInfo;
  readonly configSummary: ConfigSummary;
  readonly languages: LanguageInfo | undefined;
  readonly hookHealth: HookHealth | undefined;
  readonly baselineHealth: BaselineHealth | undefined;
  readonly operationalWarnings: readonly OperationalWarning[];

  private constructor(props: HarnessStatusSummaryProps) {
    this.layers = Object.freeze([...props.layers]);
    this.phaseGateSummary = props.phaseGateSummary;
    this.presetInfo = props.presetInfo;
    this.configSummary = props.configSummary;
    this.languages = props.languages;
    this.hookHealth = props.hookHealth;
    this.baselineHealth = props.baselineHealth;
    this.operationalWarnings = Object.freeze([...(props.operationalWarnings ?? [])]);
    Object.freeze(this);
  }

  static create(props: HarnessStatusSummaryProps): HarnessStatusSummary {
    // INV: 4レイヤー必須
    if (props.layers.length !== 4) {
      throw new Error(
        `HarnessApiDomainError: HarnessStatusSummary requires exactly 4 layers (L1-L4), got ${props.layers.length}`,
      );
    }
    // 重複チェック
    const ids = props.layers.map((l) => l.layerId);
    if (new Set(ids).size !== ids.length) {
      throw new Error("HarnessApiDomainError: HarnessStatusSummary has duplicate layerIds");
    }
    // L1-L4 必須チェック
    for (const required of REQUIRED_LAYER_IDS) {
      if (!ids.includes(required)) {
        throw new Error(`HarnessApiDomainError: HarnessStatusSummary missing required layerId ${required}`);
      }
    }
    return new HarnessStatusSummary(props);
  }

  getLayerHealth(layerId: LayerId): LayerHealth | undefined {
    return this.layers.find((l) => l.layerId === layerId);
  }

  isAllLayersHealthy(): boolean {
    return this.layers.every((l) => !l.enabled || l.lastResult === "pass");
  }
}
