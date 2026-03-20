/**
 * @layer domain
 * @unit traceability-model
 */

import type { ProjectRelativePathLike } from '../value-objects/chain-link.js';
import type { DesignDocumentFlags } from '../value-objects/design-document-flags.js';
import type { StoryIdAnnotation } from '../value-objects/story-id-annotation.js';

export interface DesignDocumentPort {
  listByUnit?(unitName: string): Promise<readonly ProjectRelativePathLike[]>;
  findConstructionDocuments?(
    unitName: string,
  ): Promise<readonly ProjectRelativePathLike[]>;
  readStoryAnnotations?(
    filePath: ProjectRelativePathLike,
  ): Promise<readonly StoryIdAnnotation[]>;
  readStoryIdAnnotations?(
    filePath: ProjectRelativePathLike,
  ): Promise<readonly StoryIdAnnotation[]>;
  readFrontmatterFlags?(
    filePath: ProjectRelativePathLike,
  ): Promise<DesignDocumentFlags>;
}
