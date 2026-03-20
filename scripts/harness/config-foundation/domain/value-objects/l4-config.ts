/**
 * @layer domain
 * @unit config-foundation
 *
 * L4Config値オブジェクト - スケジュール付きバリデータ設定（schedule非空、validators重複不可）
 */
import { ConfigValidationError } from '../errors/config-validation-error.js';

interface L4ConfigProps {
  readonly enabled: boolean;
  readonly validators: string[];
  readonly schedule: string;
}

export class L4Config {
  readonly enabled: boolean;
  readonly validators: readonly string[];
  readonly schedule: string;

  constructor(props: L4ConfigProps) {
    if (!props.schedule || props.schedule.trim() === '') {
      throw new ConfigValidationError(
        'L4Config: schedule must not be empty',
      );
    }
    const uniqueSet = new Set(props.validators);
    if (uniqueSet.size !== props.validators.length) {
      throw new ConfigValidationError(
        'L4Config: validators must not contain duplicates',
      );
    }
    this.enabled = props.enabled;
    this.validators = Object.freeze([...props.validators]);
    this.schedule = props.schedule;
    Object.freeze(this);
  }

  static create(raw: {
    enabled: boolean;
    validators: string[];
    schedule: string;
  }): L4Config {
    return new L4Config(raw);
  }

  equals(other: L4Config): boolean {
    if (this.enabled !== other.enabled) return false;
    if (this.schedule !== other.schedule) return false;
    if (this.validators.length !== other.validators.length) return false;
    for (let i = 0; i < this.validators.length; i++) {
      if (this.validators[i] !== other.validators[i]) return false;
    }
    return true;
  }
}
