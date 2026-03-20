/**
 * @layer domain
 * @unit traceability-model
 */

import type { ProjectRelativePathLike } from '../value-objects/chain-link.js';
import type { StoryIdLike } from '../value-objects/story-reference.js';

export interface InceptionPlanPort {
  exists?(unitName: string, storyId: StoryIdLike): Promise<boolean>;
  findPlanRoot?(
    unitName: string,
    storyId: StoryIdLike,
  ): Promise<ProjectRelativePathLike | null>;
  findPlanByStoryId?(storyId: StoryIdLike): Promise<ProjectRelativePathLike | null>;
}
