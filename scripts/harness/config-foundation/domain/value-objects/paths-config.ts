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
  readonly principlesDocs?: string;
  readonly folderRulesDoc?: string;
}

export class PathsConfig {
  readonly designDocs: string;
  readonly inceptionDocs: string;
  readonly principlesDocs: string;
  readonly folderRulesDoc: string;

  constructor(props: PathsConfigProps) {
    const principlesDocs = props.principlesDocs ?? 'docs/principles';
    const folderRulesDoc = props.folderRulesDoc ?? 'docs/folder_management_rules.md';

    PathsConfig.validatePath(props.designDocs, 'designDocs');
    PathsConfig.validatePath(props.inceptionDocs, 'inceptionDocs');
    PathsConfig.validatePath(principlesDocs, 'principlesDocs');
    PathsConfig.validatePath(folderRulesDoc, 'folderRulesDoc');

    this.designDocs = props.designDocs;
    this.inceptionDocs = props.inceptionDocs;
    this.principlesDocs = principlesDocs;
    this.folderRulesDoc = folderRulesDoc;
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
      this.inceptionDocs === other.inceptionDocs &&
      this.principlesDocs === other.principlesDocs &&
      this.folderRulesDoc === other.folderRulesDoc
    );
  }
}
