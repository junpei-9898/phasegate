/**
 * @layer domain
 * @unit nyquist-validation
 *
 * requirement-test-matrix の集約ルート
 */
import { DuplicateStoryMappingError } from '../errors/duplicate-story-mapping-error.js';
import type { StoryMapping } from '../entities/story-mapping.js';

export interface RequirementTestMatrixCreateProps {
  readonly storyMappings: readonly StoryMapping[];
}

export class RequirementTestMatrix {
  readonly storyMappings: readonly StoryMapping[];

  private constructor(storyMappings: readonly StoryMapping[]) {
    this.storyMappings = storyMappings;
    Object.freeze(this);
  }

  static create(props: RequirementTestMatrixCreateProps): RequirementTestMatrix {
    // INV-1: storyId重複禁止
    const ids = props.storyMappings.map((sm) => sm.storyId);
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        throw new DuplicateStoryMappingError(id);
      }
      seen.add(id);
    }

    return new RequirementTestMatrix(Object.freeze([...props.storyMappings]));
  }

  findStoryMapping(storyId: string): StoryMapping | null {
    return this.storyMappings.find((sm) => sm.storyId === storyId) ?? null;
  }

  getAllStoryMappings(): readonly StoryMapping[] {
    // storyId昇順でソートして返す
    return Object.freeze(
      [...this.storyMappings].sort((a, b) => a.storyId.localeCompare(b.storyId))
    );
  }

  totalAcCount(): number {
    return this.storyMappings.reduce((sum, sm) => sum + sm.acMappings.length, 0);
  }

  coveredAcCount(): number {
    return this.storyMappings.reduce(
      (sum, sm) => sum + sm.acMappings.filter((ac) => ac.isCovered()).length,
      0
    );
  }
}
