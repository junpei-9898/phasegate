/**
 * @layer domain
 * @unit config-foundation
 * @work-item-id WI-212
 * @work-item-id WI-320
 *
 * ProjectConfig値オブジェクト - プロジェクト名とPresetを保持する
 */
import { ConfigValidationError } from "../errors/config-validation-error.js";
import { Preset } from "./preset.js";

interface ProjectConfigProps {
  readonly name: string;
  readonly preset: Preset;
  readonly languages?: readonly string[];
}

export class ProjectConfig {
  readonly name: string;
  readonly preset: Preset;
  /**
   * WI-320 (github#39): 宣言があった場合のみ保持する（undefined = 未宣言）。
   * default `['typescript']` の注入をやめ、「未宣言」シグナルを下流
   * （validator-system のファイルシステム言語検出、WI-319）まで生存させる。
   */
  readonly languages?: readonly string[];

  constructor(props: ProjectConfigProps) {
    if (!props.name || props.name.trim() === "") {
      throw new ConfigValidationError("ProjectConfig: name must not be empty");
    }
    if (props.languages !== undefined) {
      if (props.languages.length === 0) {
        throw new ConfigValidationError("ProjectConfig: languages must not be empty");
      }
      const normalizedLanguages = props.languages
        .map((language) => language.trim())
        .filter((language) => language.length > 0);
      if (normalizedLanguages.length !== props.languages.length) {
        throw new ConfigValidationError("ProjectConfig: languages must contain non-empty strings");
      }
      this.languages = Object.freeze([...normalizedLanguages]);
    }
    this.name = props.name;
    this.preset = props.preset;
    Object.freeze(this);
  }

  static create(raw: { name: string; preset: string; languages?: readonly string[] }): ProjectConfig {
    const preset = Preset.create(raw.preset);
    return new ProjectConfig({ name: raw.name, preset, languages: raw.languages });
  }

  rename(name: string): ProjectConfig {
    return new ProjectConfig({ name, preset: this.preset, languages: this.languages });
  }

  changePreset(preset: Preset): ProjectConfig {
    return new ProjectConfig({ name: this.name, preset, languages: this.languages });
  }

  equals(other: ProjectConfig): boolean {
    return this.name === other.name && this.preset.equals(other.preset) && this.languagesEqual(other.languages);
  }

  private languagesEqual(otherLanguages: readonly string[] | undefined): boolean {
    if (this.languages === undefined || otherLanguages === undefined) {
      return this.languages === otherLanguages;
    }
    return (
      this.languages.length === otherLanguages.length &&
      this.languages.every((language, index) => language === otherLanguages[index])
    );
  }
}
