/**
 * @layer domain
 * @unit traceability-model
 */

import type { ProjectRelativePathLike } from '../value-objects/chain-link.js';

export interface MetadataTagLike {
  readonly type: string;
  readonly value: string;
  readonly lineNumber: number;
  readonly filePath?: ProjectRelativePathLike;
}

export interface MetadataReaderPort {
  readImplementationTags(
    filePath: ProjectRelativePathLike,
  ): Promise<readonly MetadataTagLike[]>;
  readTestTags?(
    filePath: ProjectRelativePathLike,
  ): Promise<readonly MetadataTagLike[]>;
}
