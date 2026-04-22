// @unit phase-dependency-model
// @layer application

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
