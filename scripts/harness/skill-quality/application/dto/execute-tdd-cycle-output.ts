/**
 * @layer application
 * @unit skill-quality
 */
import type { ValidationViolation } from '../../domain/types/validation-violation.js';

export interface ExecuteTddCycleOutput {
  readonly ready: boolean;
  readonly violations: readonly ValidationViolation[];
  readonly committedMessage: string | null;
}
