/**
 * @layer domain
 * @unit biome-ast-engine
 */

import { FilePath } from './file-path.js';

export class InvalidImportCycleError extends Error {
  constructor(pathCount: number) {
    super(`Invalid ImportCycle length: ${pathCount}`);
    this.name = 'InvalidImportCycleError';
  }
}

export class ImportCycle {
  readonly path: readonly FilePath[];
  readonly edgeCount: number;

  private constructor(path: readonly FilePath[]) {
    this.path = path;
    this.edgeCount = path.length;
  }

  static create(path: readonly FilePath[]): ImportCycle {
    if (path.length < 2) {
      throw new InvalidImportCycleError(path.length);
    }

    return Object.freeze(new ImportCycle(Object.freeze([...path])));
  }

  includes(filePath: FilePath): boolean {
    return this.path.some((pathItem) => pathItem.equals(filePath));
  }

  firstEdge(): readonly [FilePath, FilePath] {
    return Object.freeze([this.path[0], this.path[1]] as const);
  }
}
