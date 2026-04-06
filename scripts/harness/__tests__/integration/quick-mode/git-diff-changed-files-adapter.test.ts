// @layer test
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import { target, context } from '../../helpers/test-helpers.js';
import { GitDiffChangedFilesAdapter } from '../../../quick-mode/infrastructure/adapters/git-diff-changed-files-adapter.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

target('GitDiffChangedFilesAdapter', () => {
  let execSyncMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    execSyncMock = vi.mocked(execSync);
    execSyncMock.mockReset();
  });

  describe('git diffパース', () => {
    // IT-REPO-Git-001
    it('MODIFYファイルのパース（Mプレフィックス）が正しく行われる', () => {
      // Arrange
      execSyncMock.mockReturnValue(
        'M\tscripts/harness/quick-mode/domain/value-objects/changed-file.ts\n',
      );
      const adapter = new GitDiffChangedFilesAdapter();
      // Act
      const actual = adapter.getChangedFiles();
      // Assert
      expect(actual).toEqual([{
        filePath: 'scripts/harness/quick-mode/domain/value-objects/changed-file.ts',
        changeKind: 'MODIFY',
      }]);
    });

    // IT-REPO-Git-002
    it('ADDファイルのパース（Aプレフィックス）が正しく行われる', () => {
      // Arrange
      execSyncMock.mockReturnValue('A\tsrc/new-feature.ts\n');
      const adapter = new GitDiffChangedFilesAdapter();
      // Act
      const actual = adapter.getChangedFiles();
      // Assert
      expect(actual).toEqual([{ filePath: 'src/new-feature.ts', changeKind: 'CREATE' }]);
    });

    // IT-REPO-Git-003
    it('DELETEファイルのパース（Dプレフィックス）が正しく行われる', () => {
      // Arrange
      execSyncMock.mockReturnValue('D\tsrc/old-feature.ts\n');
      const adapter = new GitDiffChangedFilesAdapter();
      // Act
      const actual = adapter.getChangedFiles();
      // Assert
      expect(actual).toEqual([{ filePath: 'src/old-feature.ts', changeKind: 'DELETE' }]);
    });

    // IT-REPO-Git-004
    it('RENAMEファイルのパース（R100プレフィックス）で移動先をMODIFYとして扱う', () => {
      // Arrange
      execSyncMock.mockReturnValue('R100\tsrc/old.ts\tsrc/new.ts\n');
      const adapter = new GitDiffChangedFilesAdapter();
      // Act
      const actual = adapter.getChangedFiles();
      // Assert
      expect(actual).toEqual([{ filePath: 'src/new.ts', changeKind: 'MODIFY' }]);
    });

    // IT-REPO-Git-005
    it('複数ファイル混在のパースが正しく行われる', () => {
      // Arrange
      execSyncMock.mockReturnValue('M\tsrc/a.ts\nA\tsrc/b.ts\nD\tsrc/c.ts\n');
      const adapter = new GitDiffChangedFilesAdapter();
      // Act
      const actual = adapter.getChangedFiles();
      // Assert
      expect(actual).toHaveLength(3);
      expect(actual).toEqual([
        { filePath: 'src/a.ts', changeKind: 'MODIFY' },
        { filePath: 'src/b.ts', changeKind: 'CREATE' },
        { filePath: 'src/c.ts', changeKind: 'DELETE' },
      ]);
    });

    // IT-REPO-Git-006
    it('空の差分（staged変更なし）で空配列が返る', () => {
      // Arrange
      execSyncMock.mockReturnValue('');
      const adapter = new GitDiffChangedFilesAdapter();
      // Act
      const actual = adapter.getChangedFiles();
      // Assert
      expect(actual).toEqual([]);
    });

    // IT-REPO-Git-007
    it('ファイルパスの正規化（../ を含むパスが解決される）', () => {
      // Arrange
      execSyncMock.mockReturnValue('M\t./scripts/../scripts/harness/foo.ts\n');
      const adapter = new GitDiffChangedFilesAdapter();
      // Act
      const actual = adapter.getChangedFiles();
      // Assert
      expect(actual).toEqual([{ filePath: 'scripts/harness/foo.ts', changeKind: 'MODIFY' }]);
    });
  });

  describe('エラーハンドリング', () => {
    // IT-REPO-Git-008
    it('gitコマンドが失敗した場合にGitCommandErrorが投げられる', () => {
      // Arrange
      execSyncMock.mockImplementation(() => {
        throw new Error('Command failed');
      });
      const adapter = new GitDiffChangedFilesAdapter();
      // Act & Assert
      expect(() => adapter.getChangedFiles()).toThrow();
    });

    // IT-REPO-Git-009
    it('git未インストール環境でGitNotAvailableErrorが投げられる', () => {
      // Arrange
      execSyncMock.mockImplementation(() => {
        throw new Error('git: command not found');
      });
      const adapter = new GitDiffChangedFilesAdapter();
      // Act & Assert
      expect(() => adapter.getChangedFiles()).toThrow();
    });

    // IT-REPO-Git-010
    it('非gitディレクトリでGitNotAvailableErrorが投げられる', () => {
      // Arrange
      execSyncMock.mockImplementation(() => {
        throw new Error('not a git repository');
      });
      const adapter = new GitDiffChangedFilesAdapter();
      // Act & Assert
      expect(() => adapter.getChangedFiles()).toThrow();
    });
  });
});
