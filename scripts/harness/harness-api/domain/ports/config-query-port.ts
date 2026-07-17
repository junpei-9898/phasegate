// @layer domain
// config-query-port.ts

import type {
  ConfigSummary,
  LanguageInfo,
  PhaseGateSummary,
  PresetInfo,
} from "../value-objects/harness-status-summary.js";

export interface ConfigQueryPort {
  getPresetInfo(): Promise<PresetInfo>;
  getConfigSummary(): Promise<ConfigSummary>;
  getPhaseGateSummary(): Promise<PhaseGateSummary>;
  /**
   * WI-328: 実効言語リストと出所（declared / detected / fallback）を返す。
   * 後方互換のため optional — 未実装アダプタでは status に languages を出さない。
   */
  getLanguageInfo?(): Promise<LanguageInfo>;
}
