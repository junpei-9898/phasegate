/**
 * @layer domain
 * @unit config-foundation
 *
 * L2Config値オブジェクト - バリデータID一覧を保持する（重複不可）
 */
import { ConfigValidationError } from '../errors/config-validation-error.js';

interface L2ConfigProps {
  readonly enabled: boolean;
  readonly validators: string[];
}

export class L2Config {
  readonly enabled: boolean;
  readonly validators: readonly string[];

  constructor(props: L2ConfigProps) {
    const uniqueSet = new Set(props.validators);
    if (uniqueSet.size !== props.validators.length) {
      throw new ConfigValidationError(
        'L2Config: validators must not contain duplicates',
      );
    }
    this.enabled = props.enabled;
    this.validators = Object.freeze([...props.validators]);
    Object.freeze(this);
  }

  static create(raw: { enabled: boolean; validators: string[] }): L2Config {
    return new L2Config(raw);
  }

  contains(validatorId: string): boolean {
    return this.validators.includes(validatorId);
  }

  equals(other: L2Config): boolean {
    if (this.enabled !== other.enabled) return false;
    if (this.validators.length !== other.validators.length) return false;
    for (let i = 0; i < this.validators.length; i++) {
      if (this.validators[i] !== other.validators[i]) return false;
    }
    return true;
  }
}
