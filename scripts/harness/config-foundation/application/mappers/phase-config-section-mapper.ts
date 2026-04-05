/**
 * @layer application
 * @unit config-foundation
 */
import type { HarnessConfigV2 } from '../../domain/harness-config.js';

function toPhasePreset(
  value: string,
): 'default' | 'full' | 'standard' | 'minimal' | 'custom' {
  if (
    value === 'default'
    || value === 'full'
    || value === 'standard'
    || value === 'minimal'
    || value === 'custom'
  ) {
    return value;
  }

  return 'default';
}

type PhaseDependenciesWithGates = HarnessConfigV2['phaseDependencies'] & {
  readonly gates?: readonly unknown[];
};

export function toPhaseConfigSection(resolvedConfig: HarnessConfigV2) {
  const phaseDependencies = resolvedConfig.phaseDependencies as PhaseDependenciesWithGates;

  return {
    planningMode: resolvedConfig.planningMode,
    customization: {
      preset: toPhasePreset(phaseDependencies.preset),
      overrideEnabled: phaseDependencies.override,
      rules: phaseDependencies.customRules.map((rule) => ({
        targetPhase: rule.phase,
        condition: 'requires' as const,
        action: rule.requires,
      })),
      gates: phaseDependencies.gates ?? [],
    },
    reportingOutputDir: resolvedConfig.reporting.outputDir,
  };
}
