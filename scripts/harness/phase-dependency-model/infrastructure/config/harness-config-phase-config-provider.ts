/**
 * @layer infrastructure
 * @unit phase-dependency-model
 */

import type { PhaseConfigProviderPort } from '../../domain/ports/phase-config-provider-port.js';
import { PlanningMode } from '../../domain/values/planning-mode.js';
import {
  PhaseCustomizationPolicy,
  type PresetName,
} from '../../domain/values/phase-customization-policy.js';
import { CustomRule } from '../../domain/values/custom-rule.js';
import { StoryReflectionConfig } from '../../domain/values/story-reflection-config.js';
import { StoryReflectionMapping } from '../../domain/values/story-reflection-mapping.js';
import { FULL_STORY_REFLECTION_DEFAULTS } from '../../domain/definitions/full-story-reflection-defaults.js';
import { STANDARD_STORY_REFLECTION_DEFAULTS } from '../../domain/definitions/standard-story-reflection-defaults.js';
import { MINIMAL_STORY_REFLECTION_DEFAULTS } from '../../domain/definitions/minimal-story-reflection-defaults.js';

export interface StoryReflectionMappingInput {
  readonly inception: string;
  readonly product: string;
  readonly required: boolean;
}

export interface StoryReflectionSectionInput {
  readonly enabled?: boolean;
  readonly mappings?: readonly StoryReflectionMappingInput[];
}

export type PhasePresetInput =
  | 'default'
  | 'full'
  | 'standard'
  | 'minimal'
  | 'custom';

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
    readonly preset?: PhasePresetInput;
    readonly overrideEnabled?: boolean;
    readonly rules?: ReadonlyArray<{
      readonly targetPhase: string;
      readonly condition: string;
      readonly action: readonly string[];
    }>;
  };
  readonly storyReflection?: StoryReflectionSectionInput;
  readonly reportingOutputDir?: string;
}

/**
 * プリセットごとの storyReflection デフォルト定義。
 * `default` は v1.0 で `full` に統合されたため同一値にエイリアスする。
 */
const PRESET_STORY_REFLECTION_DEFAULTS: Record<PresetName, StoryReflectionConfig> = {
  full: FULL_STORY_REFLECTION_DEFAULTS,
  standard: STANDARD_STORY_REFLECTION_DEFAULTS,
  minimal: MINIMAL_STORY_REFLECTION_DEFAULTS,
  // custom プリセットは明示設定を強制するためデフォルトは無効扱い
  custom: StoryReflectionConfig.disabled(),
};

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

  async getStoryReflectionConfig(): Promise<StoryReflectionConfig> {
    const policy = await this.getCustomizationPolicy();
    const presetDefault = PRESET_STORY_REFLECTION_DEFAULTS[policy.preset];
    const section = this.config.storyReflection;

    if (section === undefined) {
      return presetDefault;
    }

    // enabled 明示 false → disabled で即返す（mappings 無視）
    if (section.enabled === false) {
      return StoryReflectionConfig.disabled();
    }

    // enabled 省略時はプリセットの enabled を継承
    const enabled = section.enabled ?? presetDefault.enabled;

    // mappings 省略 → プリセットデフォルトの mappings を流用
    const rawMappings = section.mappings;
    if (rawMappings === undefined) {
      return StoryReflectionConfig.create({
        enabled,
        mappings: presetDefault.mappings,
      });
    }

    const mappings = rawMappings.map((m) =>
      StoryReflectionMapping.create({
        inception: m.inception,
        product: m.product,
        required: m.required,
      }),
    );

    return StoryReflectionConfig.create({ enabled, mappings });
  }
}
