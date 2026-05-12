/**
 * @layer application
 * @unit config-foundation
 * @work-item-id WI-133
 */
import type { HarnessConfigV2 } from '../../domain/harness-config.js';

export function toValidatorSystemConfig(resolvedConfig: HarnessConfigV2 | undefined): object | undefined {
  if (!resolvedConfig) return undefined;

  return {
    project: { preset: resolvedConfig.project.preset },
    layers: {
      L2: { enabled: resolvedConfig.layers.L2.enabled, validators: ['L2-001', 'L2-002', 'L2-003', 'L2-013', 'L2-014', 'L2-015'] },
      L3: { enabled: resolvedConfig.layers.L3.enabled },
      L4: { enabled: resolvedConfig.layers.L4.enabled, validators: resolvedConfig.layers.L4.validators },
    },
    validate: {
      failOnWarning: resolvedConfig.validate.failOnWarning,
    },
  };
}
