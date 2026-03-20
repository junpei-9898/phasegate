/**
 * @layer infrastructure
 * @unit phase2-extensions
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { PointerResolverPort } from '../../domain/ports/pointer-resolver-port.js';
import type { Pointer } from '../../domain/value-objects/pointer.js';

export class FileSystemPointerResolverAdapter implements PointerResolverPort {
  constructor(private readonly projectRoot: string) {}

  async resolve(pointer: Pointer): Promise<boolean> {
    if (pointer.isUrl()) {
      return true;
    }

    try {
      await fs.access(path.resolve(this.projectRoot, pointer.target));
      return true;
    } catch {
      return false;
    }
  }
}
