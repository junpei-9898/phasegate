/**
 * @layer application
 * @unit config-foundation
 * @work-item-id WI-092 / WI-094 / WI-033
 */
import type { HarnessConfigV2 } from '../../domain/harness-config.js';

export function toValidatorSystemConfig(resolvedConfig: HarnessConfigV2 | undefined): object | undefined {
  if (!resolvedConfig) return undefined;

  return {
    project: { preset: resolvedConfig.project.preset },
    layers: {
      L2: { enabled: resolvedConfig.layers.L2.enabled },
      L3: { enabled: resolvedConfig.layers.L3.enabled },
      L4: { enabled: resolvedConfig.layers.L4.enabled, validators: resolvedConfig.layers.L4.validators },
    },
    validate: {
      failOnWarning: resolvedConfig.validate.failOnWarning,
    },
  };
}
