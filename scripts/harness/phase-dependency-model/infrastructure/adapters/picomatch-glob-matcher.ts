// @unit phase-dependency-model
// @layer infrastructure

import { createRequire } from 'node:module';
import type { GlobMatcherPort } from '../../domain/ports/glob-matcher-port.js';

const require = createRequire(import.meta.url);
const picomatch = require('picomatch') as (
  pattern: string,
  options?: { readonly dot?: boolean },
) => (path: string) => boolean;

export class PicomatchGlobMatcher implements GlobMatcherPort {
  match(pattern: string, path: string): boolean {
    return picomatch(pattern, { dot: true })(path);
  }
}
