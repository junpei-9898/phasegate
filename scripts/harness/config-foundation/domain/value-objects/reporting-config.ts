/**
 * @layer domain
 * @unit config-foundation
 *
 * レポート設定を表す値オブジェクト
 * format と outputDir は空文字不可
 */
import { ConfigValidationError } from '../errors/config-validation-error.js';

export interface ReportingConfigProps {
  readonly format: string;
  readonly outputDir: string;
}

export class ReportingConfig {
  readonly format: string;
  readonly outputDir: string;

  constructor(props: ReportingConfigProps) {
    if (props.format === '') {
      throw new ConfigValidationError('format は空文字にできません');
    }
    if (props.outputDir === '') {
      throw new ConfigValidationError('outputDir は空文字にできません');
    }

    this.format = props.format;
    this.outputDir = props.outputDir;
  }

  static create(raw: ReportingConfigProps): ReportingConfig {
    return new ReportingConfig(raw);
  }

  equals(other: ReportingConfig): boolean {
    return (
      this.format === other.format && this.outputDir === other.outputDir
    );
  }
}
