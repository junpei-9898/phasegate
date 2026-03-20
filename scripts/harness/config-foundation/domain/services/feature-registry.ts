/**
 * @layer domain
 * @unit config-foundation
 */
import { UnsupportedFeatureError } from '../errors/unsupported-feature-error.js';
import type { FeatureRegistryPort } from '../ports/feature-registry-port.js';
import { FeatureName, type FeatureNameValue } from '../value-objects/feature-name.js';

const FEATURE_ORDER: readonly FeatureNameValue[] = [
  'agentLessonCollection',
  'cascadeUpdate',
  'bundleSizeLimit',
  'deadCodeGC',
];

export class FeatureRegistry {
  listAvailable(source: FeatureRegistryPort): readonly FeatureName[] {
    const uniqueNames = [...new Set(source.listAvailable())];

    return uniqueNames
      .map((name) => FeatureName.create(name, FEATURE_ORDER))
      .sort(
        (left, right) =>
          FEATURE_ORDER.indexOf(left.value) - FEATURE_ORDER.indexOf(right.value),
      );
  }

  ensureAvailable(name: string, source: FeatureRegistryPort): FeatureName {
    const available = this.listAvailable(source);
    const actual = available.find((featureName) => featureName.toString() === name);

    if (!actual) {
      throw new UnsupportedFeatureError(
        `機能名 "${name}" は利用できません。利用可能: ${available
          .map((featureName) => featureName.toString())
          .join(', ')}`,
      );
    }

    return actual;
  }
}
