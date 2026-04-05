// @unit phase-dependency-model
// @layer presentation
/**
 * StoryReflectionStatusPresenter
 *
 * CLI (`phasegate:status`, `phasegate validate --layer L2`) 用の
 * storyReflection 状態整形を担うプレゼンター。
 *
 * 責務:
 *   - status コマンド向けの 1 行サマリー生成（有効/無効・preset・mapping 数）
 *   - validate --layer L2 向けの検証結果サマリー生成
 *     （violations / warnings 件数と代表情報）
 *
 * 呼び出し元 (main.ts / presentation) で設定と CheckStoryReflectionUseCase の
 * 実行結果を受け取り、人間可読な行を組み立てる。
 */

import type { StoryReflectionConfig } from '../../domain/values/story-reflection-config.js';
import type { StoryReflectionResult } from '../../domain/values/story-reflection-result.js';
import type { PresetName } from '../../domain/values/phase-customization-policy.js';

export interface StoryReflectionStatusLineInput {
  readonly config: StoryReflectionConfig;
  readonly preset: PresetName;
}

export interface StoryReflectionValidationSummaryInput {
  readonly config: StoryReflectionConfig;
  readonly preset: PresetName;
  readonly result: StoryReflectionResult;
}

export class StoryReflectionStatusPresenter {
  formatStatusLine(input: StoryReflectionStatusLineInput): string {
    const { config, preset } = input;
    const state = config.enabled ? 'enabled' : 'disabled';
    const required = config.mappings.filter((m) => m.required).length;
    const optional = config.mappings.filter((m) => !m.required).length;

    return [
      'storyReflection:',
      state,
      `preset=${preset}`,
      `mappings=${config.mappings.length}`,
      `required=${required}`,
      `optional=${optional}`,
    ].join(' ');
  }

  formatValidationSummary(input: StoryReflectionValidationSummaryInput): string {
    const { config, preset, result } = input;
    const lines: string[] = [];

    if (!config.enabled) {
      lines.push(
        `[L2-STORY-REFLECTION] disabled (preset=${preset}, violations=0, warnings=0)`,
      );
      return lines.join('\n');
    }

    const status = result.isBlocked() ? 'failed' : 'passed';
    const violations = result.violations.length;
    const warnings = result.warnings.length;

    lines.push(
      `[L2-STORY-REFLECTION] ${status} (preset=${preset}, mappings=${config.mappings.length}, violations=${violations}, warnings=${warnings})`,
    );

    if (result.isBlocked()) {
      for (const violation of result.violations) {
        lines.push(
          `  - ${violation.storyId}: ${violation.productPath} に @story-id ${violation.storyId} が未反映 (inception: ${violation.inceptionPath})`,
        );
      }
    }

    if (warnings > 0) {
      for (const warning of result.warnings) {
        lines.push(
          `  ! ${warning.storyId}: ${warning.productPath} に @story-id ${warning.storyId} が未反映 (optional)`,
        );
      }
    }

    return lines.join('\n');
  }
}
