/**
 * @layer application
 * @unit config-foundation
 */
export interface FeatureToggleResult {
  readonly feature: string;
  readonly enabled: boolean;
  readonly configPath: string;
}
