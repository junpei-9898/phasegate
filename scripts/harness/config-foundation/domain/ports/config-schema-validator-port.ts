/**
 * @layer domain
 * @unit config-foundation
 */
import type { HarnessError } from '../../../harness-error/domain/value-objects/harness-error.js';

export interface ConfigSchemaValidatorPort {
  validate(document: unknown): readonly HarnessError[];
}
