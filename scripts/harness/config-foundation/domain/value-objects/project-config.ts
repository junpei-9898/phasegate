/**
 * @layer domain
 * @unit config-foundation
 * @work-item-id WI-212
 *
 * ProjectConfig値オブジェクト - プロジェクト名とPresetを保持する
 */
import { ConfigValidationError } from '../errors/config-validation-error.js';
import { Preset } from './preset.js';

interface ProjectConfigProps {
  readonly name: string;
  readonly preset: Preset;
  readonly languages?: readonly string[];
}

export class ProjectConfig {
  readonly name: string;
  readonly preset: Preset;
  readonly languages: readonly string[];

  constructor(props: ProjectConfigProps) {
    if (!props.name || props.name.trim() === '') {
      throw new ConfigValidationError('ProjectConfig: name must not be empty');
    }
    const sourceLanguages = props.languages ?? ['typescript'];
    if (sourceLanguages.length === 0) {
      throw new ConfigValidationError('ProjectConfig: languages must not be empty');
    }
    const normalizedLanguages = sourceLanguages.map((language) => language.trim()).filter((language) => language.length > 0);
    if (normalizedLanguages.length !== sourceLanguages.length) {
      throw new ConfigValidationError('ProjectConfig: languages must contain non-empty strings');
    }
    this.name = props.name;
    this.preset = props.preset;
    this.languages = Object.freeze([...normalizedLanguages]);
    Object.freeze(this);
  }

  static create(raw: { name: string; preset: string; languages?: readonly string[] }): ProjectConfig {
    const preset = Preset.create(raw.preset);
    return new ProjectConfig({ name: raw.name, preset, languages: raw.languages ?? ['typescript'] });
  }

  rename(name: string): ProjectConfig {
    return new ProjectConfig({ name, preset: this.preset, languages: this.languages });
  }

  changePreset(preset: Preset): ProjectConfig {
    return new ProjectConfig({ name: this.name, preset, languages: this.languages });
  }

  equals(other: ProjectConfig): boolean {
    return this.name === other.name
      && this.preset.equals(other.preset)
      && this.languages.length === other.languages.length
      && this.languages.every((language, index) => language === other.languages[index]);
  }
}
