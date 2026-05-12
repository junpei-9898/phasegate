/**
 * @layer application
 * @unit config-foundation
 * @work-item-id WI-133
 */
import type { HarnessConfigV2 } from '../../domain/harness-config.js';

export function toValidatorSystemConfig(resolvedConfig: HarnessConfigV2 | undefined): object | undefined {
  if (!resolvedConfig) return undefined;

  const l3Validators = normalizeValidators(resolvedConfig.layers.L3.validators, {
    security: 'L3-001',
    performance: 'L3-002',
    coverage: 'L3-003',
    nyquist: 'L3-004',
  }, /^L3-\d{3}$/);
  const l4Validators = normalizeValidators(resolvedConfig.layers.L4.validators, {
    'drift-detect': 'L4-001',
    'drift-detector': 'L4-001',
    'consistency-check': 'L4-002',
    'consistency-checker': 'L4-002',
    'dead-code': 'L4-003',
    'dead-code-detector': 'L4-003',
    'doc-freshness': 'L4-004',
    'doc-freshness-checker': 'L4-004',
    'pointer-validation': 'L4-005',
    'pointer-validator': 'L4-005',
  }, /^L4-\d{3}$/);

  return {
    project: { preset: resolvedConfig.project.preset },
    layers: {
      L2: { enabled: resolvedConfig.layers.L2.enabled, validators: ['L2-001', 'L2-002', 'L2-003', 'L2-013', 'L2-014', 'L2-015'] },
      L3: {
        enabled: resolvedConfig.layers.L3.enabled,
        ...(l3Validators.length > 0 ? { validators: l3Validators } : {}),
        coverageThreshold: resolvedConfig.layers.L3.coverageThreshold,
      },
      L4: {
        enabled: resolvedConfig.layers.L4.enabled,
        ...(l4Validators.length > 0 ? { validators: l4Validators } : {}),
      },
    },
    harnesses: {
      bundleSizeLimit: resolvedConfig.harnesses.bundleSizeLimit,
      deadCodeGC: resolvedConfig.harnesses.deadCodeGC,
    },
    architecture: resolvedConfig.architecture,
    validate: {
      failOnWarning: resolvedConfig.validate.failOnWarning,
    },
  };
}

function normalizeValidators(
  validators: readonly string[],
  aliases: Readonly<Record<string, string>>,
  idPattern: RegExp,
): readonly string[] {
  const normalized = validators
    .map((validator) => aliases[validator] ?? validator)
    .filter((validator) => idPattern.test(validator));
  return [...new Set(normalized)];
}
