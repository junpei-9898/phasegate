/**
 * @layer application
 * @unit traceability-model
 */

import type { ProjectRelativePath } from '../../domain/value-objects/project-relative-path.js';

export interface MetadataValidationInput {
  readonly filePaths: readonly ProjectRelativePath[];
  readonly failOnWarning?: boolean;
  readonly format?: string;
}
