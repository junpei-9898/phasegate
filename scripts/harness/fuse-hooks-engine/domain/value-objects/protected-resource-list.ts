/**
 * @layer domain
 * @unit fuse-hooks-engine
 */

import { FuseHooksEngineDomainError } from '../errors/fuse-hooks-engine-domain-error.js';
import { isValidGlob, matchesGlob } from '../internal/glob.js';
import { Result } from '../result.js';

export class ProtectedResourceList {
  private constructor(readonly patterns: readonly string[]) {}

  static create(patterns: string[]) {
    const invalid = patterns.find((pattern) => !isValidGlob(pattern));
    if (invalid) {
      return Result.err(
        new FuseHooksEngineDomainError('PROTECTED_RESOURCE_INVALID_GLOB', `Invalid glob pattern: ${invalid}`),
      );
    }
    return Result.ok(new ProtectedResourceList([...patterns]));
  }

  matches(filePath: string): boolean {
    return this.patterns.some((pattern) => matchesGlob(pattern, filePath));
  }

  equals(other: ProtectedResourceList): boolean {
    return JSON.stringify(this.patterns) === JSON.stringify(other.patterns);
  }
}
