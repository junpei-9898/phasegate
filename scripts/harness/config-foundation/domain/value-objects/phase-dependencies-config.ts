/**
 * @layer domain
 * @unit config-foundation
 *
 * フェーズ依存設定を表す値オブジェクト
 * 意味論検証は行わず構造のみ保持する
 */
import { CustomPhaseRule } from './custom-phase-rule.js';
import type { CustomPhaseRuleProps } from './custom-phase-rule.js';

export interface PhaseDependenciesConfigProps {
  readonly preset: 'default' | 'custom';
  readonly override: boolean;
  readonly customRules: readonly CustomPhaseRuleProps[];
}

export class PhaseDependenciesConfig {
  readonly preset: 'default' | 'custom';
  readonly override: boolean;
  readonly customRules: readonly CustomPhaseRule[];

  constructor(props: PhaseDependenciesConfigProps) {
    this.preset = props.preset;
    this.override = props.override;
    this.customRules = props.customRules.map(
      (rule) => new CustomPhaseRule(rule)
    );
  }

  static create(raw: PhaseDependenciesConfigProps): PhaseDependenciesConfig {
    return new PhaseDependenciesConfig(raw);
  }

  hasCustomRules(): boolean {
    return this.customRules.length > 0;
  }

  equals(other: PhaseDependenciesConfig): boolean {
    if (this.preset !== other.preset) return false;
    if (this.override !== other.override) return false;
    if (this.customRules.length !== other.customRules.length) return false;
    return this.customRules.every((rule, idx) =>
      rule.equals(other.customRules[idx])
    );
  }
}
