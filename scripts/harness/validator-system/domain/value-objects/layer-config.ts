/**
 * @layer domain
 * @unit validator-system
 *
 * LayerConfig 値オブジェクト
 * HarnessConfigV2から注入されるL2/L3/L4の実行設定VO
 */
import { ValidatorId } from './validator-id.js';

export interface LayerConfigProps {
  readonly layer: 'L2' | 'L3' | 'L4';
  readonly enabled: boolean;
  readonly validatorIds: readonly string[];
  readonly thresholds: Record<string, number>;
  readonly strictOnly: boolean;
  readonly preset: 'minimal' | 'standard' | 'strict';
}

export class LayerConfig {
  readonly layer: 'L2' | 'L3' | 'L4';
  readonly enabled: boolean;
  readonly validatorIds: readonly string[];
  readonly thresholds: Readonly<Record<string, number>>;
  readonly strictOnly: boolean;
  readonly preset: 'minimal' | 'standard' | 'strict';

  private constructor(props: LayerConfigProps) {
    this.layer = props.layer;
    this.enabled = props.enabled;
    this.validatorIds = Object.freeze([...props.validatorIds]);
    this.thresholds = Object.freeze({ ...props.thresholds });
    this.strictOnly = props.strictOnly;
    this.preset = props.preset;
    Object.freeze(this);
  }

  static create(props: LayerConfigProps): LayerConfig {
    return new LayerConfig(props);
  }

  isValidatorEnabled(validatorId: ValidatorId): boolean {
    if (!this.enabled) return false;
    return this.validatorIds.includes(validatorId.value);
  }

  getThreshold(key: string): number | null {
    const val = this.thresholds[key];
    return val !== undefined ? val : null;
  }

  equals(other: LayerConfig): boolean {
    return (
      this.layer === other.layer &&
      this.enabled === other.enabled &&
      this.strictOnly === other.strictOnly &&
      this.preset === other.preset &&
      JSON.stringify(this.validatorIds) === JSON.stringify(other.validatorIds) &&
      JSON.stringify(this.thresholds) === JSON.stringify(other.thresholds)
    );
  }
}
