/**
 * @layer infrastructure
 * @unit ci-governance
 *
 * PresetConfigPort実装
 */

import type { PresetConfigPort, PresetConfig } from '../../domain/ports/preset-config-port.js';

export class PresetConfigAdapter implements PresetConfigPort {
  async getPreset(presetId: string): Promise<PresetConfig> {
    // In a real implementation, would fetch from config-foundation
    const presets: Record<string, PresetConfig> = {
      standard: { failOnWarning: false },
      strict: { failOnWarning: true },
      minimal: { failOnWarning: false },
    };
    const preset = presets[presetId];
    if (!preset) {
      throw new Error(`Preset not found: ${presetId}`);
    }
    return preset;
  }
}
