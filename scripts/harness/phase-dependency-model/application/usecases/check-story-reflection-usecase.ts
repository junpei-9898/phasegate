/**
 * @layer application
 * @unit phase-dependency-model
 *
 * CheckStoryReflectionUseCase
 * StoryReflectionChecker をオーケストレーションし、inception → product への
 * storyId 反映状況を検証するユースケース。
 *
 * 入力: unitId, StoryReflectionConfig
 * 出力: StoryReflectionResult（pass/fail + violations/warnings）
 *
 * enabled=false の場合は即座に pass を返す。
 */

import type { StoryReflectionChecker } from '../../domain/services/story-reflection-checker.js';
import type { StoryReflectionConfig } from '../../domain/values/story-reflection-config.js';
import { StoryReflectionResult } from '../../domain/values/story-reflection-result.js';

export interface CheckStoryReflectionInput {
  readonly unitId: string;
  readonly config: StoryReflectionConfig;
}

export interface CheckStoryReflectionUseCaseDeps {
  readonly checker: StoryReflectionChecker;
}

export class CheckStoryReflectionUseCase {
  private readonly checker: StoryReflectionChecker;

  constructor(deps: CheckStoryReflectionUseCaseDeps) {
    this.checker = deps.checker;
  }

  async execute(input: CheckStoryReflectionInput): Promise<StoryReflectionResult> {
    if (!input.config.enabled) {
      return StoryReflectionResult.pass();
    }

    return this.checker.check(input.unitId, input.config);
  }
}
