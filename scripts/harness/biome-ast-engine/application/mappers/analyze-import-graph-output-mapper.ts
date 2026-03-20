/**
 * @layer application
 * @unit biome-ast-engine
 */

import type { FilePath } from '../../domain/value-objects/file-path.js';
import type { ImportGraph } from '../../domain/value-objects/import-graph.js';
import type { SourceModuleSnapshot } from '../../domain/value-objects/source-module-snapshot.js';
import type { AnalyzeImportGraphOutput } from '../dto/analyze-import-graph-output.js';

export const toAnalyzeImportGraphOutput = (
  files: readonly FilePath[],
  snapshots: readonly SourceModuleSnapshot[],
  importGraph: ImportGraph
): Readonly<AnalyzeImportGraphOutput> =>
  Object.freeze({
    files: Object.freeze([...files]),
    snapshots: Object.freeze([...snapshots]),
    importGraph,
  });
