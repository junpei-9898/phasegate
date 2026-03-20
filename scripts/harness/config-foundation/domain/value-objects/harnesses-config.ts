/**
 * @layer domain
 * @unit config-foundation
 *
 * GSD由来品質機能の設定を表す値オブジェクト
 * bundleSizeLimit は 0 以上、0 は無効を表すセンチネル値
 * デフォルト無効原則に従い初期値は false/0
 */
import { InvalidHarnessesConfigError } from '../errors/invalid-harnesses-config-error.js';
import type { FeatureName } from './feature-name.js';

export interface HarnessesConfigProps {
  readonly agentLessonCollection: boolean;
  readonly cascadeUpdate: boolean;
  readonly bundleSizeLimit: number;
  readonly deadCodeGC: boolean;
}

const BUNDLE_SIZE_LIMIT_DEFAULT_ENABLED_VALUE = 500;

export class HarnessesConfig {
  readonly agentLessonCollection: boolean;
  readonly cascadeUpdate: boolean;
  readonly bundleSizeLimit: number;
  readonly deadCodeGC: boolean;

  constructor(props: HarnessesConfigProps) {
    if (props.bundleSizeLimit < 0) {
      throw new InvalidHarnessesConfigError(
        `bundleSizeLimit は 0 以上でなければなりません。実際の値: ${props.bundleSizeLimit}`
      );
    }

    this.agentLessonCollection = props.agentLessonCollection;
    this.cascadeUpdate = props.cascadeUpdate;
    this.bundleSizeLimit = props.bundleSizeLimit;
    this.deadCodeGC = props.deadCodeGC;
  }

  static create(raw: HarnessesConfigProps): HarnessesConfig {
    return new HarnessesConfig(raw);
  }

  enable(name: FeatureName): HarnessesConfig {
    const featureKey = name.value;

    if (featureKey === 'bundleSizeLimit') {
      return new HarnessesConfig({
        agentLessonCollection: this.agentLessonCollection,
        cascadeUpdate: this.cascadeUpdate,
        bundleSizeLimit:
          this.bundleSizeLimit === 0
            ? BUNDLE_SIZE_LIMIT_DEFAULT_ENABLED_VALUE
            : this.bundleSizeLimit,
        deadCodeGC: this.deadCodeGC,
      });
    }

    return new HarnessesConfig({
      agentLessonCollection:
        featureKey === 'agentLessonCollection'
          ? true
          : this.agentLessonCollection,
      cascadeUpdate:
        featureKey === 'cascadeUpdate' ? true : this.cascadeUpdate,
      bundleSizeLimit: this.bundleSizeLimit,
      deadCodeGC: featureKey === 'deadCodeGC' ? true : this.deadCodeGC,
    });
  }

  disable(name: FeatureName): HarnessesConfig {
    const featureKey = name.value;

    if (featureKey === 'bundleSizeLimit') {
      return new HarnessesConfig({
        agentLessonCollection: this.agentLessonCollection,
        cascadeUpdate: this.cascadeUpdate,
        bundleSizeLimit: 0,
        deadCodeGC: this.deadCodeGC,
      });
    }

    return new HarnessesConfig({
      agentLessonCollection:
        featureKey === 'agentLessonCollection'
          ? false
          : this.agentLessonCollection,
      cascadeUpdate:
        featureKey === 'cascadeUpdate' ? false : this.cascadeUpdate,
      bundleSizeLimit: this.bundleSizeLimit,
      deadCodeGC: featureKey === 'deadCodeGC' ? false : this.deadCodeGC,
    });
  }

  isEnabled(name: FeatureName): boolean {
    const featureKey = name.value;

    if (featureKey === 'bundleSizeLimit') {
      return this.bundleSizeLimit > 0;
    }

    return this[featureKey] as boolean;
  }

  equals(other: HarnessesConfig): boolean {
    return (
      this.agentLessonCollection === other.agentLessonCollection &&
      this.cascadeUpdate === other.cascadeUpdate &&
      this.bundleSizeLimit === other.bundleSizeLimit &&
      this.deadCodeGC === other.deadCodeGC
    );
  }
}
