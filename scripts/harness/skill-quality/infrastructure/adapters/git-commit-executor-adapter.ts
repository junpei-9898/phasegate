/**
 * @layer infrastructure
 * @unit skill-quality
 */
import { execFileSync } from 'node:child_process';
import type { CommitExecutorPort } from '../../domain/ports/commit-executor-port.js';
import type { CommitMessage } from '../../domain/value-objects/commit-message.js';
import { SkillQualityError } from '../../domain/errors/skill-quality-error.js';

// WI-036: 配列引数で execFileSync を直接呼ぶことでシェル経由のメタ文字評価を遮断する。
type GitExecutor = (file: string, args: readonly string[], options: { stdio: 'pipe' }) => Buffer;

export class GitCommitExecutorAdapter implements CommitExecutorPort {
  constructor(private readonly gitExecutor: GitExecutor = execFileSync) {}

  async commit(commitMessage: CommitMessage): Promise<void> {
    const message = commitMessage.format();
    try {
      this.gitExecutor('git', ['commit', '-m', message], { stdio: 'pipe' });
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
