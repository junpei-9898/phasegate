/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

import * as path from 'node:path';
import { FuseHooksEngineDomainError } from '../errors/fuse-hooks-engine-domain-error.js';
import { Result } from '../result.js';

export class MagicFile {
  private constructor(
    readonly filePath: string,
    readonly requiredFields: readonly string[],
  ) {}

  static create(filePath: string, requiredFields: string[] = []) {
    if (path.isAbsolute(filePath)) {
      return Result.err(
        new FuseHooksEngineDomainError('MAGIC_FILE_ABSOLUTE_PATH', 'Magic file path must be relative'),
      );
    }
    return Result.ok(new MagicFile(filePath, [...requiredFields]));
  }

  equals(other: MagicFile): boolean {
    return this.filePath === other.filePath
      && JSON.stringify(this.requiredFields) === JSON.stringify(other.requiredFields);
  }
}
