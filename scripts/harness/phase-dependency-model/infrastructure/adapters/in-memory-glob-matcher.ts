// @unit phase-dependency-model
// @layer infrastructure

import type { GlobMatcherPort } from '../../domain/ports/glob-matcher-port.js';

export class InMemoryGlobMatcher implements GlobMatcherPort {
  match(pattern: string, path: string): boolean {
    if (pattern === path) {
      return true;
    }

    if (pattern.endsWith('/**')) {
      const prefix = pattern.slice(0, -3);
      return path === prefix || path.startsWith(`${prefix}/`);
    }

    if (pattern.includes('*')) {
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
      return new RegExp(`^${escaped}$`).test(path);
    }

    return false;
  }
}
