/**
 * @layer domain
 * @unit nyquist-validation
 *
 * ストーリー単位のAC→テスト参照マッピングエンティティ
 */
// @work-item-id WI-292
import type { AcMapping, RawAcMapping } from '../value-objects/ac-mapping.js';

export type StoryCoverageStatus = 'planned' | 'required';

export interface StoryMappingCreateProps {
  readonly storyId: string;
  readonly acMappings: readonly AcMapping[];
  readonly coverageStatus?: StoryCoverageStatus;
  readonly coverageLifecycle?: readonly StoryCoverageStatus[];
}

export class StoryMapping {
  readonly storyId: string;
  readonly acMappings: readonly AcMapping[];
  readonly coverageStatus: StoryCoverageStatus;
  readonly coverageLifecycle: readonly StoryCoverageStatus[];

  private constructor(
    storyId: string,
    acMappings: readonly AcMapping[],
    coverageStatus: StoryCoverageStatus,
    coverageLifecycle: readonly StoryCoverageStatus[],
  ) {
    this.storyId = storyId;
    this.acMappings = acMappings;
    this.coverageStatus = coverageStatus;
    this.coverageLifecycle = coverageLifecycle;
    Object.freeze(this);
  }

  static create(props: StoryMappingCreateProps): StoryMapping {
    const coverageStatus = props.coverageStatus ?? 'required';
    const coverageLifecycle = props.coverageLifecycle ?? [coverageStatus];
    return new StoryMapping(
      props.storyId,
      Object.freeze([...props.acMappings]),
      coverageStatus,
      Object.freeze([...coverageLifecycle]),
    );
  }

  findAcMapping(acId: string): AcMapping | null {
    return this.acMappings.find((m) => m.acId === acId) ?? null;
  }

  uncoveredAcIds(): readonly string[] {
    return Object.freeze(
      this.acMappings.filter((m) => !m.isCovered()).map((m) => m.acId)
    );
  }

  testReferenceCount(): number {
    return this.acMappings.reduce((total, mapping) => total + mapping.testReferences.length, 0);
  }

  equals(other: StoryMapping): boolean {
    return this.storyId === other.storyId;
  }
}

export interface RawStoryMapping {
  readonly storyId: string;
  readonly acMappings: readonly RawAcMapping[];
  readonly coverageStatus?: StoryCoverageStatus;
  readonly coverageLifecycle?: readonly StoryCoverageStatus[];
}
