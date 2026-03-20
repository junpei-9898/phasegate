/**
 * @layer domain
 * @unit traceability-model
 */

import type { ProjectRelativePathLike } from '../value-objects/chain-link.js';

export interface UnitDefinitionPort {
  getAllUnitNames?(): Promise<readonly string[]>;
  exists?(unitName: string): Promise<boolean>;
  hasUnit?(unitName: string): Promise<boolean>;
  findConstructionRoot?(unitName: string): Promise<ProjectRelativePathLike | null>;
  resolveConstructionRoot?(unitName: string): Promise<ProjectRelativePathLike | null>;
}
