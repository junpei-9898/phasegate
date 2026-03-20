/**
 * @layer domain
 * @unit config-foundation
 *
 * L1Config値オブジェクト - Biome ASTルール設定を保持する
 */
import { ConfigValidationError } from '../errors/config-validation-error.js';

const ALLOWED_SEVERITIES = ['error', 'warning', 'off'] as const;
type Severity = (typeof ALLOWED_SEVERITIES)[number];

interface L1ConfigProps {
  readonly enabled: boolean;
  readonly rules: Record<string, string>;
}

export class L1Config {
  readonly enabled: boolean;
  readonly rules: Readonly<Record<string, Severity>>;

  constructor(props: L1ConfigProps) {
    for (const [ruleName, severity] of Object.entries(props.rules)) {
      if (!ALLOWED_SEVERITIES.includes(severity as Severity)) {
        throw new ConfigValidationError(
          `L1Config: invalid severity "${severity}" for rule "${ruleName}". Allowed: error, warning, off`,
        );
      }
    }
    this.enabled = props.enabled;
    this.rules = Object.freeze({ ...props.rules }) as Readonly<Record<string, Severity>>;
    Object.freeze(this);
  }

  static create(raw: { enabled: boolean; rules: Record<string, string> }): L1Config {
    return new L1Config(raw);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getRuleSeverity(ruleName: string): Severity | undefined {
    return this.rules[ruleName] as Severity | undefined;
  }

  equals(other: L1Config): boolean {
    if (this.enabled !== other.enabled) return false;
    const thisKeys = Object.keys(this.rules).sort();
    const otherKeys = Object.keys(other.rules).sort();
    if (thisKeys.length !== otherKeys.length) return false;
    for (let i = 0; i < thisKeys.length; i++) {
      if (thisKeys[i] !== otherKeys[i]) return false;
      if (this.rules[thisKeys[i]] !== other.rules[otherKeys[i]]) return false;
    }
    return true;
  }
}
