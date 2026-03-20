/**
 * @layer application
 * @unit config-foundation
 */
import type { HarnessError } from '../../../harness-error/domain/value-objects/harness-error.js';

export interface ValidateConfigResult {
  readonly valid: boolean;
  readonly errors: readonly HarnessError[];
}
