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
      const rawMessage = err instanceof Error ? err.message : String(err);
      // "nothing to commit" を検出して分かりやすいメッセージに変換
      const isNothingToCommit =
        rawMessage.includes('nothing to commit') ||
        rawMessage.includes('nothing added to commit') ||
        rawMessage.includes('no changes added to commit');
      if (isNothingToCommit) {
        throw new SkillQualityError(
          'GIT_COMMIT_FAILED',
          'git commit failed: ステージングされた変更がありません。先に git add でファイルをステージングしてください。',
        );
      }
      throw new SkillQualityError('GIT_COMMIT_FAILED', `git commit failed: ${rawMessage}`);
    }
  }
}
