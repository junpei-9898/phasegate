/**
 * @layer domain
 * @unit phase-dependency-model
 */

import type { StoryReflectionFileSystemPort } from "../ports/story-reflection-file-system-port.js";
import type { StoryReflectionConfig } from "../values/story-reflection-config.js";
import type { StoryReflectionMapping } from "../values/story-reflection-mapping.js";
import { StoryReflectionResult, type StoryReflectionViolation } from "../values/story-reflection-result.js";

const CROSS_WORK_ITEM_PATTERN = /^WI-\d+$/;

interface ResolvedInceptionPath {
  readonly path: string;
  readonly isCrossWorkItem: boolean;
}

export class StoryReflectionChecker {
  constructor(private readonly fsPort: StoryReflectionFileSystemPort) {}

  async check(unitId: string, config: StoryReflectionConfig): Promise<StoryReflectionResult> {
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
        const { product: productPath } = mapping.resolve({ unitId, storyId });
        const resolvedInception = await this.resolveInceptionPath({
          mapping,
          unitId,
          storyId,
        });

        if (resolvedInception === null) {
          continue;
        }

        if (resolvedInception.isCrossWorkItem && !(await this.fsPort.storyAffectsUnit(storyId, unitId))) {
          continue;
        }

        const hasAnnotation = await this.fsPort.fileContainsStoryAnnotation(productPath, storyId);

        if (!hasAnnotation) {
          const violation: StoryReflectionViolation = {
            storyId,
            mapping,
            inceptionPath: resolvedInception.path,
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

  private async resolveInceptionPath(input: {
    readonly mapping: StoryReflectionMapping;
    readonly unitId: string;
    readonly storyId: string;
  }): Promise<ResolvedInceptionPath | null> {
    const normalPath = input.mapping.resolve({
      unitId: input.unitId,
      storyId: input.storyId,
    }).inception;

    if (await this.fsPort.fileExists(normalPath)) {
      return { path: normalPath, isCrossWorkItem: false };
    }

    if (!CROSS_WORK_ITEM_PATTERN.test(input.storyId)) {
      return null;
    }

    const crossPath = input.mapping.resolve({
      unitId: "_cross",
      storyId: input.storyId,
    }).inception;

    if (await this.fsPort.fileExists(crossPath)) {
      return { path: crossPath, isCrossWorkItem: true };
    }

    return null;
  }
}
