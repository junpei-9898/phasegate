/**
 * @layer infrastructure
 * @unit config-foundation
 */
import type { FeatureRegistryPort } from '../../domain/ports/feature-registry-port.js';

const WAVE_ONE_FEATURES = Object.freeze([
  'agentLessonCollection',
  'cascadeUpdate',
  'bundleSizeLimit',
  'deadCodeGC',
] as const);

export class StaticFeatureRegistryAdapter implements FeatureRegistryPort {
  listAvailable(): readonly string[] {
    return [...WAVE_ONE_FEATURES];
  }
}
