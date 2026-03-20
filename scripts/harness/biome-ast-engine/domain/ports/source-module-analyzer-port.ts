/**
 * @layer domain
 * @unit biome-ast-engine
 */

import { FilePath } from '../value-objects/file-path.js';
import { SourceModuleSnapshot } from '../value-objects/source-module-snapshot.js';

export interface SourceModuleAnalyzerPort {
  analyzeMany(files: readonly FilePath[]): Promise<readonly SourceModuleSnapshot[]>;
}
