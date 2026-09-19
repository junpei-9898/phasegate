// @unit agent-integration
// @layer domain

import type { StoryReflectionQueryResult } from '../value-objects/story-reflection-query-result.js';

export interface StoryReflectionQueryPort {
  checkReflection(unitId: string): Promise<StoryReflectionQueryResult>;
  /** WI-220: optional session path, advisory by default; caller supplies authenticated identity. */
  checkSessionReflection?(unitId: string, workItemId: string): Promise<StoryReflectionQueryResult>;
}
