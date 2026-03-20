/**
 * @layer domain
 * @unit traceability-model
 */

import type { StoryIdLike } from '../value-objects/story-reference.js';

export interface StoryCatalogPort {
  getAllStoryIds?(): Promise<readonly StoryIdLike[]>;
  getAliasMap?(): Promise<ReadonlyMap<string, StoryIdLike>>;
  getLegacyStoryIdAliases?(): Promise<Readonly<Record<string, string>>>;
  exists?(storyId: StoryIdLike): Promise<boolean>;
  hasStoryId?(storyId: StoryIdLike | { readonly value: string } | string): Promise<boolean>;
}
