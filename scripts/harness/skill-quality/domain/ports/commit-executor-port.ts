/**
 * @layer domain
 * @unit skill-quality
 */
import type { CommitMessage } from '../value-objects/commit-message.js';

export interface CommitExecutorPort {
  commit(commitMessage: CommitMessage): Promise<void>;
}
