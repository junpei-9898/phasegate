/**
 * @layer domain
 * @unit config-foundation
 */
export interface FeatureRegistryPort {
  listAvailable(): readonly string[];
}
