// @unit agent-integration
// @layer domain

import type { StoryReflectionQueryResult } from '../value-objects/story-reflection-query-result.js';

export interface StoryReflectionQueryPort {
  checkReflection(unitId: string): Promise<StoryReflectionQueryResult>;
}
