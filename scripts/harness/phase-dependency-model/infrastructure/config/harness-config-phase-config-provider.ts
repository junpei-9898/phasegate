/**
 * @layer infrastructure
 * @unit phase-dependency-model
 */

import type { PhaseConfigProviderPort } from '../../domain/ports/phase-config-provider-port.js';
import { PlanningMode } from '../../domain/values/planning-mode.js';
import { PhaseCustomizationPolicy } from '../../domain/values/phase-customization-policy.js';
import { CustomRule } from '../../domain/values/custom-rule.js';

export interface PhaseConfigSection {
  readonly planningMode?:
    | string
    | {
        readonly default?: string;
        readonly mode?: string;
        readonly planningMode?: string;
        readonly overrides?: Record<string, string>;
      };
  readonly customization?: {
    readonly preset?: 'default' | 'custom';
    readonly overrideEnabled?: boolean;
    readonly rules?: ReadonlyArray<{
      readonly targetPhase: string;
      readonly condition: string;
      readonly action: readonly string[];
    }>;
  };
  readonly reportingOutputDir?: string;
}

export interface HarnessConfigPhaseConfigProviderDeps {
  readonly config: PhaseConfigSection;
  readonly defaultOutputDir: string;
}

export class HarnessConfigPhaseConfigProvider
  implements PhaseConfigProviderPort
{
  private readonly config: PhaseConfigSection;
  private readonly defaultOutputDir: string;

  constructor(deps: HarnessConfigPhaseConfigProviderDeps) {
    this.config = deps.config;
    this.defaultOutputDir = deps.defaultOutputDir;
  }

  async getPlanningMode(scope: {
    unitId?: string;
    storyId?: string;
  }): Promise<PlanningMode> {
    const planningModeConfig = this.config.planningMode;

    if (planningModeConfig === undefined) {
      return PlanningMode.create('interactive');
    }

    if (typeof planningModeConfig === 'string') {
      return PlanningMode.create(planningModeConfig);
    }

    if (scope.unitId && planningModeConfig.overrides?.[scope.unitId]) {
      return PlanningMode.create(planningModeConfig.overrides[scope.unitId]);
    }

    return PlanningMode.fromConfig(planningModeConfig);
  }

  async getCustomizationPolicy(): Promise<PhaseCustomizationPolicy> {
    const customization = this.config.customization;

    if (!customization) {
      return PhaseCustomizationPolicy.create({
        preset: 'default',
        rules: [],
        overrideEnabled: false,
      });
    }

    const rules = (customization.rules ?? []).map((rule) =>
      CustomRule.create({
        targetPhase: rule.targetPhase,
        condition: rule.condition,
        action: [...rule.action],
      }),
    );

    return PhaseCustomizationPolicy.create({
      preset: customization.preset,
      rules,
      overrideEnabled: customization.overrideEnabled ?? false,
    });
  }

  async getReportingOutputDir(): Promise<string> {
    return this.config.reportingOutputDir ?? this.defaultOutputDir;
  }
}
