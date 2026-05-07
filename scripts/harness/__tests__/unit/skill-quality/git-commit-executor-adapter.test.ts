// @layer test
// @unit skill-quality
// @story H12-01
import { describe, expect, it, vi } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { GitCommitExecutorAdapter } from '../../../skill-quality/infrastructure/adapters/git-commit-executor-adapter.js';
import { CommitMessage } from '../../../skill-quality/domain/value-objects/commit-message.js';

target('GitCommitExecutorAdapter', () => {
  describe('commit(commitMessage): execFileSync 配列引数で git に渡す', () => {
    context('正常系: 通常の description', () => {
      it('execFileSync が "git" + ["commit", "-m", message] で呼ばれる', async () => {
        // Arrange
        const gitExecutor = vi.fn().mockReturnValue(Buffer.from(''));
        const adapter = new GitCommitExecutorAdapter(gitExecutor);
        const commitMessage = CommitMessage.create('skill-quality', 'H12-01', 'implement feature');

        // Act
        await adapter.commit(commitMessage);

        // Assert
        const actual = gitExecutor.mock.calls[0];
        expect(actual[0]).toBe('git');
        expect(actual[1]).toEqual([
          'commit',
          '-m',
          'feat(skill-quality/H12-01): implement feature',
        ]);
        expect(actual[2]).toEqual({ stdio: 'pipe' });
      });
    });

    context('WI-036: 悪意あるシェルメタ文字を含む description', () => {
      it('バッククオート / $() / ; / " / 改行 を含む description が引数配列にそのまま渡され、シェル評価されない', async () => {
        // Arrange
        const maliciousDescriptions = [
          'fix `echo PWNED` issue',
          'fix $(echo PWNED) issue',
          'fix ;echo PWNED',
          'fix "double quote',
          'fix\nnewline',
          'fix |cat /etc/passwd',
        ];

        for (const malicious of maliciousDescriptions) {
          const gitExecutor = vi.fn().mockReturnValue(Buffer.from(''));
          const adapter = new GitCommitExecutorAdapter(gitExecutor);
          const commitMessage = CommitMessage.create('skill-quality', 'H12-01', malicious);

          // Act
          await adapter.commit(commitMessage);

          // Assert: 引数配列の 3 要素目が format() の出力そのまま（シェル経由しない証跡）
          const actual = gitExecutor.mock.calls[0];
          expect(actual[0]).toBe('git');
          expect(actual[1][0]).toBe('commit');
          expect(actual[1][1]).toBe('-m');
          expect(actual[1][2]).toBe(`feat(skill-quality/H12-01): ${malicious}`);
        }
      });
    });

    context('異常系: git executor が "nothing to commit" を含むエラーを投げる', () => {
      it('GIT_COMMIT_FAILED コードを持つ SkillQualityError に変換される', async () => {
        // Arrange
        const gitExecutor = vi.fn().mockImplementation(() => {
          throw new Error('nothing to commit, working tree clean');
        });
        const adapter = new GitCommitExecutorAdapter(gitExecutor);
        const commitMessage = CommitMessage.create('skill-quality', 'H12-01', 'no-op');

        // Act
        const actual = adapter.commit(commitMessage);

        // Assert
        await expect(actual).rejects.toMatchObject({
          code: 'GIT_COMMIT_FAILED',
        });
      });
    });
  });
});
