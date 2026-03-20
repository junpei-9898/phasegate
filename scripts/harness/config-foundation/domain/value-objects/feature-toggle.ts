/**
 * @layer domain
 * @unit config-foundation
 *
 * 機能の有効/無効状態を表す値オブジェクト
 */
import { FeatureName } from './feature-name.js';

export interface FeatureToggleProps {
  readonly name: FeatureName;
  readonly enabled: boolean;
}

export class FeatureToggle {
  readonly name: FeatureName;
  readonly enabled: boolean;

  constructor(props: FeatureToggleProps) {
    this.name = props.name;
    this.enabled = props.enabled;
  }

  static create(name: FeatureName, enabled: boolean): FeatureToggle {
    return new FeatureToggle({ name, enabled });
  }

  toggle(nextState: boolean): FeatureToggle {
    return new FeatureToggle({ name: this.name, enabled: nextState });
  }

  equals(other: FeatureToggle): boolean {
    return this.name.equals(other.name) && this.enabled === other.enabled;
  }
}
