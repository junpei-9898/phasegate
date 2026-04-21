// @unit ci-governance
// @layer infrastructure

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { FileHasherPort } from '../../domain/ports/file-hasher-port.js';

export class FileSystemSha1HasherAdapter implements FileHasherPort {
  constructor(private readonly baseDir: string) {}

  async hashFile(relativePath: string): Promise<string> {
    const absPath = path.isAbsolute(relativePath)
      ? relativePath
      : path.join(this.baseDir, relativePath);
    const content = await fs.readFile(absPath);
    return crypto.createHash('sha1').update(content).digest('hex');
  }
}
