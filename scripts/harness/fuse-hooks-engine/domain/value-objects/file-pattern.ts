/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

import { FuseHooksEngineDomainError } from '../errors/fuse-hooks-engine-domain-error.js';
import { matchesGlob, isValidGlob } from '../internal/glob.js';
import { Result } from '../result.js';

export class FilePattern {
  private constructor(
    readonly includePatterns: readonly string[],
    readonly excludePatterns: readonly string[],
  ) {}

  static create(includePatterns: string[], excludePatterns: string[] = []) {
    if (includePatterns.length === 0) {
      return Result.err(
        new FuseHooksEngineDomainError(
          'HOOK_EMPTY_INCLUDE_PATTERN',
          'includePatterns must have at least one entry',
        ),
      );
    }
    const invalid = [...includePatterns, ...excludePatterns].find((pattern) => !isValidGlob(pattern));
    if (invalid) {
      return Result.err(
        new FuseHooksEngineDomainError('HOOK_INVALID_GLOB_PATTERN', `Invalid glob pattern: ${invalid}`),
      );
    }
    return Result.ok(new FilePattern([...includePatterns], [...excludePatterns]));
  }

  test(filePath: string): boolean {
    const included = this.includePatterns.some((pattern) => matchesGlob(pattern, filePath));
    const excluded = this.excludePatterns.some((pattern) => matchesGlob(pattern, filePath));
    return included && !excluded;
  }

  equals(other: FilePattern): boolean {
    return JSON.stringify(this.includePatterns) === JSON.stringify(other.includePatterns)
      && JSON.stringify(this.excludePatterns) === JSON.stringify(other.excludePatterns);
  }
}
