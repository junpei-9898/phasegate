/**
 * @layer infrastructure
 * @unit skill-quality
 */
import type { L2ValidatorPort } from '../../domain/ports/l2-validator-port.js';
import type { CommitMessage } from '../../domain/value-objects/commit-message.js';
import type { ValidationViolation } from '../../domain/types/validation-violation.js';

export class L2ValidatorSystemAdapter implements L2ValidatorPort {
  async validate(_commitMessage: CommitMessage): Promise<readonly ValidationViolation[]> {
    // Stub implementation - Wave 2 validator-system integration pending
    return [];
  }
}
