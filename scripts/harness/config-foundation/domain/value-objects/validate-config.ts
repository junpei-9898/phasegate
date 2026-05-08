/**
 * @layer domain
 * @unit config-foundation
 *
 * バリデーション挙動設定を表す値オブジェクト (ADR-017 / WI-094)
 * failOnWarning=true の場合、warning-only validator fail も overall FAIL として扱う
 */
import { ConfigValidationError } from '../errors/config-validation-error.js';

export interface ValidateConfigProps {
  readonly failOnWarning: boolean;
}

export class ValidateConfig {
  readonly failOnWarning: boolean;

  constructor(props: ValidateConfigProps) {
    if (typeof props.failOnWarning !== 'boolean') {
      throw new ConfigValidationError('failOnWarning は boolean でなければなりません');
    }

    this.failOnWarning = props.failOnWarning;
  }

  static create(raw: ValidateConfigProps): ValidateConfig {
    return new ValidateConfig(raw);
  }

  equals(other: ValidateConfig): boolean {
    return this.failOnWarning === other.failOnWarning;
  }
}
