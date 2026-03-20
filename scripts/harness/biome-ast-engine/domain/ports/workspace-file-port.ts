/**
 * @layer domain
 * @unit biome-ast-engine
 */

import { FilePath } from '../value-objects/file-path.js';

export interface WorkspaceFilePort {
  listSourceFiles(targets?: readonly string[]): Promise<readonly FilePath[]>;
  readText(filePath: FilePath): Promise<string>;
  exists(filePath: FilePath): Promise<boolean>;
}
