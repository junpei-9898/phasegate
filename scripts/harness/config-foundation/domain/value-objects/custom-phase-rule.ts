/**
 * @layer domain
 * @unit config-foundation
 *
 * カスタムフェーズルールを表す値オブジェクト
 * phase は空文字不可、requires は重複不可
 */
import { ConfigValidationError } from '../errors/config-validation-error.js';

export interface CustomPhaseRuleProps {
  readonly phase: string;
  readonly requires: readonly string[];
}

export class CustomPhaseRule {
  readonly phase: string;
  readonly requires: readonly string[];

  constructor(props: CustomPhaseRuleProps) {
    if (props.phase === '') {
      throw new ConfigValidationError('phase は空文字にできません');
    }

    const uniqueRequires = new Set(props.requires);
    if (uniqueRequires.size !== props.requires.length) {
      throw new ConfigValidationError('requires に重複する要素があります');
    }

    this.phase = props.phase;
    this.requires = [...props.requires];
  }

  static create(raw: CustomPhaseRuleProps): CustomPhaseRule {
    return new CustomPhaseRule(raw);
  }

  equals(other: CustomPhaseRule): boolean {
    if (this.phase !== other.phase) return false;
    if (this.requires.length !== other.requires.length) return false;
    return this.requires.every((val, idx) => val === other.requires[idx]);
  }
}
