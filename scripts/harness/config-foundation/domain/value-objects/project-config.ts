/**
 * @layer domain
 * @unit config-foundation
 *
 * ProjectConfig値オブジェクト - プロジェクト名とPresetを保持する
 */
import { ConfigValidationError } from '../errors/config-validation-error.js';
import { Preset } from './preset.js';

interface ProjectConfigProps {
  readonly name: string;
  readonly preset: Preset;
}

export class ProjectConfig {
  readonly name: string;
  readonly preset: Preset;

  constructor(props: ProjectConfigProps) {
    if (!props.name || props.name.trim() === '') {
      throw new ConfigValidationError('ProjectConfig: name must not be empty');
    }
    this.name = props.name;
    this.preset = props.preset;
    Object.freeze(this);
  }

  static create(raw: { name: string; preset: string }): ProjectConfig {
    const preset = Preset.create(raw.preset);
    return new ProjectConfig({ name: raw.name, preset });
  }

  rename(name: string): ProjectConfig {
    return new ProjectConfig({ name, preset: this.preset });
  }

  changePreset(preset: Preset): ProjectConfig {
    return new ProjectConfig({ name: this.name, preset });
  }

  equals(other: ProjectConfig): boolean {
    return this.name === other.name && this.preset.equals(other.preset);
  }
}
