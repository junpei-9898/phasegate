/**
 * @layer domain
 * @unit phase-dependency-model
 */

import type { Artifact, PathRoots } from '../values/artifact.js';

export interface ArtifactExistenceCheckerPort {
  checkAll(
    artifacts: readonly Artifact[],
    scope: { unitId?: string; storyId?: string },
    pathRoots?: PathRoots,
  ): Promise<ReadonlyMap<string, boolean>>;
}
