/**
 * @layer domain
 * @unit nyquist-validation
 *
 * ストーリー単位のAC→テスト参照マッピングエンティティ
 */
import type { AcMapping, RawAcMapping } from '../value-objects/ac-mapping.js';

export interface StoryMappingCreateProps {
  readonly storyId: string;
  readonly acMappings: readonly AcMapping[];
}

export class StoryMapping {
  readonly storyId: string;
  readonly acMappings: readonly AcMapping[];

  private constructor(storyId: string, acMappings: readonly AcMapping[]) {
    this.storyId = storyId;
    this.acMappings = acMappings;
    Object.freeze(this);
  }

  static create(props: StoryMappingCreateProps): StoryMapping {
    return new StoryMapping(props.storyId, Object.freeze([...props.acMappings]));
  }

  findAcMapping(acId: string): AcMapping | null {
    return this.acMappings.find((m) => m.acId === acId) ?? null;
  }

  uncoveredAcIds(): readonly string[] {
    return Object.freeze(
      this.acMappings.filter((m) => !m.isCovered()).map((m) => m.acId)
    );
  }

  equals(other: StoryMapping): boolean {
    return this.storyId === other.storyId;
  }
}

export interface RawStoryMapping {
  readonly storyId: string;
  readonly acMappings: readonly RawAcMapping[];
}
