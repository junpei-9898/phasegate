/**
 * @layer domain
 * @unit phase-dependency-model
 */

import type { StoryReflectionConfig } from '../values/story-reflection-config.js';
import type { StoryReflectionFileSystemPort } from '../ports/story-reflection-file-system-port.js';
import {
  StoryReflectionResult,
  type StoryReflectionViolation,
} from '../values/story-reflection-result.js';

export class StoryReflectionChecker {
  constructor(private readonly fsPort: StoryReflectionFileSystemPort) {}

  async check(
    unitId: string,
    config: StoryReflectionConfig,
  ): Promise<StoryReflectionResult> {
    if (!config.enabled) {
      return StoryReflectionResult.pass();
    }

    const storyIds = await this.fsPort.listStoryDirectories(unitId);

    if (storyIds.length === 0) {
      return StoryReflectionResult.pass();
    }

    const violations: StoryReflectionViolation[] = [];
    const warnings: StoryReflectionViolation[] = [];

    for (const storyId of storyIds) {
      for (const mapping of config.mappings) {
        const { inception: inceptionPath, product: productPath } =
          mapping.resolve({ unitId, storyId });

        const inceptionExists = await this.fsPort.fileExists(inceptionPath);

        if (!inceptionExists) {
          continue;
        }

        const hasAnnotation =
          await this.fsPort.fileContainsStoryAnnotation(productPath, storyId);

        if (!hasAnnotation) {
          const violation: StoryReflectionViolation = {
            storyId,
            mapping,
            inceptionPath,
            productPath,
          };

          if (mapping.required) {
            violations.push(violation);
          } else {
            warnings.push(violation);
          }
        }
      }
    }

    return StoryReflectionResult.create({ violations, warnings });
  }
}
