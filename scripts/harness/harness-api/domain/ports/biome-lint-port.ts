// @unit harness-api
// @layer domain
// biome-lint-port.ts

import type { HarnessError } from '../value-objects/harness-api-response.js';

export interface BiomeLintPort {
  runLint(reportTargets?: readonly string[]): Promise<{
    passed: boolean;
    errors: HarnessError[];
    warnings: HarnessError[];
  }>;
}
