/**
 * @layer infrastructure
 * @unit skill-quality
 */
import type { L1ValidatorPort } from '../../domain/ports/l1-validator-port.js';
import type { CommitMessage } from '../../domain/value-objects/commit-message.js';
import type { ValidationViolation } from '../../domain/types/validation-violation.js';

export class L1BiomeValidatorAdapter implements L1ValidatorPort {
  async validate(_commitMessage: CommitMessage): Promise<readonly ValidationViolation[]> {
    // Stub implementation - runs biome lint on staged files
    // Full implementation would invoke biome-ast-engine L1 rules
    return [];
  }
}
