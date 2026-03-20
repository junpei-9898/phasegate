/**
 * @layer infrastructure
 * @unit skill-quality
 */
import { execSync } from 'node:child_process';
import type { CommitExecutorPort } from '../../domain/ports/commit-executor-port.js';
import type { CommitMessage } from '../../domain/value-objects/commit-message.js';
import { SkillQualityError } from '../../domain/errors/skill-quality-error.js';

export class GitCommitExecutorAdapter implements CommitExecutorPort {
  async commit(commitMessage: CommitMessage): Promise<void> {
    const message = commitMessage.format();
    try {
      execSync(`git commit -m ${JSON.stringify(message)}`, { stdio: 'pipe' });
    } catch (err) {
      throw new SkillQualityError('GIT_COMMIT_FAILED', `git commit failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
