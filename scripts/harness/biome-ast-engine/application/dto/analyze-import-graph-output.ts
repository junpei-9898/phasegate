/**
 * @layer application
 * @unit biome-ast-engine
 */

import type { FilePath } from '../../domain/value-objects/file-path.js';
import type { ImportGraph } from '../../domain/value-objects/import-graph.js';
import type { SourceModuleSnapshot } from '../../domain/value-objects/source-module-snapshot.js';

export type AnalyzeImportGraphOutput = {
  readonly files: readonly FilePath[];
  readonly snapshots: readonly SourceModuleSnapshot[];
  readonly importGraph: ImportGraph;
};
