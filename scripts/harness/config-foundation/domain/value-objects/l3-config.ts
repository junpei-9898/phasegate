/**
 * @layer domain
 * @unit config-foundation
 *
 * L3Config値オブジェクト - カバレッジ閾値を持つ（0-100）
 */
import { ConfigValidationError } from '../errors/config-validation-error.js';

interface L3ConfigProps {
  readonly enabled: boolean;
  readonly validators: string[];
  readonly coverageThreshold: number;
}

export class L3Config {
  readonly enabled: boolean;
  readonly validators: readonly string[];
  readonly coverageThreshold: number;

  constructor(props: L3ConfigProps) {
    if (props.coverageThreshold < 0) {
      throw new ConfigValidationError(
        `L3Config: coverageThreshold must be >= 0, got ${props.coverageThreshold}`,
      );
    }
    if (props.coverageThreshold > 100) {
      throw new ConfigValidationError(
        `L3Config: coverageThreshold must be <= 100, got ${props.coverageThreshold}`,
      );
    }
    const uniqueSet = new Set(props.validators);
    if (uniqueSet.size !== props.validators.length) {
      throw new ConfigValidationError(
        'L3Config: validators must not contain duplicates',
      );
    }
    this.enabled = props.enabled;
    this.validators = Object.freeze([...props.validators]);
    this.coverageThreshold = props.coverageThreshold;
    Object.freeze(this);
  }

  static create(raw: {
    enabled: boolean;
    validators: string[];
    coverageThreshold: number;
  }): L3Config {
    return new L3Config(raw);
  }

  hasCoverageGate(): boolean {
    return this.coverageThreshold > 0;
  }

  equals(other: L3Config): boolean {
    if (this.enabled !== other.enabled) return false;
    if (this.coverageThreshold !== other.coverageThreshold) return false;
    if (this.validators.length !== other.validators.length) return false;
    for (let i = 0; i < this.validators.length; i++) {
      if (this.validators[i] !== other.validators[i]) return false;
    }
    return true;
  }
}
