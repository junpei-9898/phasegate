/**
 * @layer application
 * @unit biome-ast-engine
 */

import type { ArchitectureSpec } from '../../domain/value-objects/architecture-spec.js';

export type AnalyzeImportGraphInput = {
  readonly targets?: readonly string[];
  readonly architecture?: ArchitectureSpec;
};
