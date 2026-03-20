/**
 * @layer domain
 * @unit skill-quality
 */
import type { CommitMessage } from '../value-objects/commit-message.js';
import type { ValidationViolation } from '../types/validation-violation.js';

export interface L2ValidatorPort {
  validate(commitMessage: CommitMessage): Promise<readonly ValidationViolation[]>;
}
