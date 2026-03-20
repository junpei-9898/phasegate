/**
 * @layer domain
 * @unit phase-dependency-model
 */

import type { Artifact } from '../values/artifact.js';

export interface ArtifactExistenceCheckerPort {
  checkAll(
    artifacts: readonly Artifact[],
    scope: { unitId?: string; storyId?: string },
  ): Promise<ReadonlyMap<string, boolean>>;
}
