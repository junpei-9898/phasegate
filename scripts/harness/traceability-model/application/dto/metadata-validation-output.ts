/**
 * @layer application
 * @unit traceability-model
 */

import type { TraceabilityHarnessError } from '../../domain/value-objects/metadata-validation-result.js';

export interface MetadataValidationOutput {
  readonly filePath: string;
  readonly valid: boolean;
  readonly errors: readonly TraceabilityHarnessError[];
  readonly warnings: readonly TraceabilityHarnessError[];
}
