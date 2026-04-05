/**
 * @layer domain
 * @unit phase-dependency-model
 */

import { StoryReflectionMapping } from './story-reflection-mapping.js';

export interface StoryReflectionConfigCreateArgs {
  readonly enabled: boolean;
  readonly mappings: readonly StoryReflectionMapping[];
}

export class StoryReflectionConfig {
  readonly enabled: boolean;
  readonly mappings: readonly StoryReflectionMapping[];

  private constructor(args: StoryReflectionConfigCreateArgs) {
    this.enabled = args.enabled;
    this.mappings = Object.freeze([...args.mappings]);
    Object.freeze(this);
  }

  static create(args: StoryReflectionConfigCreateArgs): StoryReflectionConfig {
    return new StoryReflectionConfig(args);
  }

  static disabled(): StoryReflectionConfig {
    return new StoryReflectionConfig({ enabled: false, mappings: [] });
  }

  requiredMappings(): readonly StoryReflectionMapping[] {
    return this.mappings.filter((m) => m.required);
  }

  optionalMappings(): readonly StoryReflectionMapping[] {
    return this.mappings.filter((m) => !m.required);
  }

  equals(other: StoryReflectionConfig): boolean {
    if (this.enabled !== other.enabled) return false;
    if (this.mappings.length !== other.mappings.length) return false;
    return this.mappings.every((m, i) => m.equals(other.mappings[i]));
  }
}
