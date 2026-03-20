/**
 * @layer domain
 * @unit config-foundation
 *
 * トグル対象機能名を表す値オブジェクト
 * FeatureRegistryPort から供給された一覧に含まれる場合のみ生成可能
 */
import { UnsupportedFeatureError } from '../errors/unsupported-feature-error.js';

export type FeatureNameValue =
  | 'agentLessonCollection'
  | 'cascadeUpdate'
  | 'bundleSizeLimit'
  | 'deadCodeGC';

export class FeatureName {
  readonly value: FeatureNameValue;

  private constructor(value: FeatureNameValue) {
    this.value = value;
  }

  static create(raw: string, availableNames: readonly string[]): FeatureName {
    if (!availableNames.includes(raw)) {
      throw new UnsupportedFeatureError(
        `機能名 "${raw}" は利用できません。利用可能: ${availableNames.join(', ')}`
      );
    }
    return new FeatureName(raw as FeatureNameValue);
  }

  toString(): string {
    return this.value;
  }

  equals(other: FeatureName): boolean {
    return this.value === other.value;
  }
}
