// @layer domain
// config-query-port.ts

import type { PresetInfo, ConfigSummary, PhaseGateSummary } from '../value-objects/harness-status-summary.js';

export interface ConfigQueryPort {
  getPresetInfo(): Promise<PresetInfo>;
  getConfigSummary(): Promise<ConfigSummary>;
  getPhaseGateSummary(): Promise<PhaseGateSummary>;
}
