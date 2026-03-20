/**
 * @layer domain
 * @unit ci-governance
 */

export interface PresetConfig {
  readonly failOnWarning: boolean;
}

export interface PresetConfigPort {
  getPreset(presetId: string): Promise<PresetConfig>;
}
