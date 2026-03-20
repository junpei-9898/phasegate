/**
 * @layer infrastructure
 * @unit ci-governance
 *
 * FileExistencePort実装
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { FileExistencePort } from '../../domain/ports/file-existence-port.js';

export class FileSystemExistenceAdapter implements FileExistencePort {
  constructor(private readonly baseDir: string) {}

  async exists(filePath: string): Promise<boolean> {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.baseDir, filePath);
    try {
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }
}
