// @layer test
// @unit phase2-extensions
// @story HF2-04
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { GitLogInitialCreationAgeAdapter } from '../../../phase2-extensions/infrastructure/adapters/git-log-initial-creation-age-adapter.js';

target('IT-P2-049〜051 GitLogInitialCreationAgeAdapter', () => {
  let tmpDir: string;
  let adapter: GitLogInitialCreationAgeAdapter;
  let gitExecutor: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hf2-04-age-'));
    await fs.writeFile(path.join(tmpDir, 'a.md'), '# A');
    gitExecutor = vi.fn();
    adapter = new GitLogInitialCreationAgeAdapter(
      tmpDir,
      () => new Date('2026-04-20T00:00:00.000Z'),
      gitExecutor,
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  context('getAge(filePath)', () => {
    it('git log で初回コミット日と回数を取得できる', async () => {
      // Arrange
      gitExecutor.mockImplementation((command: string) => {
        if (command.includes('git log')) {
          return Buffer.from('2026-04-10 12:00:00 +0900\n');
        }

        if (command.includes('git rev-list')) {
          return Buffer.from('2\n');
        }

        return Buffer.from('');
      });

      // Act
      const actual = await adapter.getAge('a.md');

      // Assert
      expect(actual.source).toBe('git-log');
      expect(actual.commitCount).toBe(2);
      expect(actual.ageInDays).toBeGreaterThanOrEqual(9);
    });

    it('git 未管理環境では file-mtime にフォールバックする', async () => {
      // Arrange
      gitExecutor.mockImplementation(() => {
        throw new Error('not a git repository');
      });

      // Act
      const actual = await adapter.getAge('a.md');

      // Assert
      expect(actual.source).toBe('file-mtime');
      expect(actual.commitCount).toBe(1);
    });

    it('対象ファイル未存在かつ git も失敗するとき例外を投げる', async () => {
      // Arrange
      gitExecutor.mockImplementation(() => {
        throw new Error('no git');
      });

      // Act & Assert
      await expect(adapter.getAge('does-not-exist.md')).rejects.toThrow();
    });
  });
});
