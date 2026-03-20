/**
 * @layer domain
 * @unit config-foundation
 *
 * パス設定を表す値オブジェクト
 * 空文字不可、グローバルパス（~ や $HOME）不可
 */
import { ConfigValidationError } from '../errors/config-validation-error.js';

export interface PathsConfigProps {
  readonly designDocs: string;
  readonly inceptionDocs: string;
}

export class PathsConfig {
  readonly designDocs: string;
  readonly inceptionDocs: string;

  constructor(props: PathsConfigProps) {
    PathsConfig.validatePath(props.designDocs, 'designDocs');
    PathsConfig.validatePath(props.inceptionDocs, 'inceptionDocs');

    this.designDocs = props.designDocs;
    this.inceptionDocs = props.inceptionDocs;
  }

  private static validatePath(value: string, fieldName: string): void {
    if (value === '') {
      throw new ConfigValidationError(
        `${fieldName} は空文字にできません`
      );
    }
    if (value.includes('~') || value.includes('$HOME')) {
      throw new ConfigValidationError(
        `${fieldName} にグローバルパス（~ または $HOME）は使用できません`
      );
    }
  }

  static create(raw: PathsConfigProps): PathsConfig {
    return new PathsConfig(raw);
  }

  equals(other: PathsConfig): boolean {
    return (
      this.designDocs === other.designDocs &&
      this.inceptionDocs === other.inceptionDocs
    );
  }
}
