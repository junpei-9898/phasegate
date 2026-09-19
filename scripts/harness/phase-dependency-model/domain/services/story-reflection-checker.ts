/**
 * @layer domain
 * @unit phase-dependency-model
 * @work-item-id WI-220
 */

import type { StoryReflectionFileSystemPort } from "../ports/story-reflection-file-system-port.js";
import type { StoryReflectionConfig } from "../values/story-reflection-config.js";
import type { StoryReflectionMapping } from "../values/story-reflection-mapping.js";
import { StoryReflectionResult, type StoryReflectionViolation } from "../values/story-reflection-result.js";
import type { WorkItemReflectionScope } from "./work-item-reflection-scope-resolver.js";
import type { PathRoots } from "../values/artifact.js";

const CROSS_WORK_ITEM_PATTERN = /^WI-\d+$/;

interface ResolvedInceptionPath {
  readonly path: string;
  readonly isCrossWorkItem: boolean;
}

export class StoryReflectionChecker {
  constructor(private readonly fsPort: StoryReflectionFileSystemPort) {}

  async check(unitId: string, config: StoryReflectionConfig, roots?: PathRoots): Promise<StoryReflectionResult> {
    if (!config.enabled) {
      return StoryReflectionResult.pass();
    }

    const storyIds = await this.fsPort.listStoryDirectories(unitId);

    return this.checkItems(unitId, storyIds, config, false, roots);
  }

  /** Accept only a complete, caller-resolved scope; this method does not authenticate its origin. */
  async checkResolvedScope(
    scope: Extract<WorkItemReflectionScope, { status: 'complete' }>,
    config: StoryReflectionConfig,
    roots?: PathRoots,
  ): Promise<StoryReflectionResult> {
    if (!config.enabled) return StoryReflectionResult.pass();
    if (scope.workItems.length === 0) throw new Error('Resolved reflection scope must not be empty');
    const byUnit = new Map<string, Set<string>>();
    for (const item of scope.workItems) {
      for (const unit of item.unitIds) {
        const ids = byUnit.get(unit) ?? new Set<string>();
        ids.add(item.id);
        byUnit.set(unit, ids);
      }
    }
    const violations: StoryReflectionViolation[] = [];
    const warnings: StoryReflectionViolation[] = [];
    for (const [unit, ids] of byUnit) {
      const result = await this.checkItems(unit, [...ids].sort(), config, true, roots);
      violations.push(...result.violations);
      warnings.push(...result.warnings);
    }
    return StoryReflectionResult.create({ violations, warnings });
  }

  private async checkItems(
    unitId: string,
    storyIds: readonly string[],
    config: StoryReflectionConfig,
    explicitScope: boolean,
    roots?: PathRoots,
  ): Promise<StoryReflectionResult> {

    if (storyIds.length === 0) {
      return StoryReflectionResult.pass();
    }

    const violations: StoryReflectionViolation[] = [];
    const warnings: StoryReflectionViolation[] = [];

    for (const storyId of storyIds) {
      for (const mapping of config.mappings) {
        const { product: productPath } = mapping.resolve({ unitId, storyId }, roots);
        const resolvedInception = await this.resolveInceptionPath({
          mapping,
          unitId,
          storyId,
          roots,
        });

        if (resolvedInception === null) {
          continue;
        }

        if (!explicitScope && resolvedInception.isCrossWorkItem && !(await this.fsPort.storyAffectsUnit(storyId, unitId))) {
          continue;
        }

        if (
          !explicitScope &&
          resolvedInception.isCrossWorkItem &&
          productPath.endsWith("domain_model.md") &&
          !(await this.fsPort.storyTouchesUnitLayer(storyId, unitId, "domain"))
        ) {
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
    readonly roots?: PathRoots;
  }): Promise<ResolvedInceptionPath | null> {
    const normalPath = input.mapping.resolve({
      unitId: input.unitId,
      storyId: input.storyId,
    }, input.roots).inception;

    if (await this.fsPort.fileExists(normalPath)) {
      return { path: normalPath, isCrossWorkItem: false };
    }

    if (!CROSS_WORK_ITEM_PATTERN.test(input.storyId)) {
      return null;
    }

    const crossPath = input.mapping.resolve({
      unitId: "_cross",
      storyId: input.storyId,
    }, input.roots).inception;

    if (await this.fsPort.fileExists(crossPath)) {
      return { path: crossPath, isCrossWorkItem: true };
    }

    return null;
  }
}
