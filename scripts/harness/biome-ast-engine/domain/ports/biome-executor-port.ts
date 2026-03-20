/**
 * @layer domain
 * @unit biome-ast-engine
 */

import { FilePath } from '../value-objects/file-path.js';

export interface BiomeExecutorPort {
  executeCheck(files: readonly FilePath[]): Promise<void>;
}
