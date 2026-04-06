// @layer test
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { GitLogDocumentAgeAdapter } from '../../../phase2-extensions/infrastructure/adapters/git-log-document-age-adapter.js';

target('IT-P2-004 GitLogDocumentAgeAdapter', () => {
  let tmpDir: string;
  let adapter: GitLogDocumentAgeAdapter;
  let gitLogExecutor: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'phase2-ext-age-'));
    await fs.mkdir(path.join(tmpDir, 'docs'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, 'docs/design.md'), '# Design');
    gitLogExecutor = vi.fn();
    adapter = new GitLogDocumentAgeAdapter(
      tmpDir,
      () => new Date('2026-03-20T00:00:00.000Z'),
      gitLogExecutor,
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  context('getAge(documentPath)', () => {
    it('git log が有効な日時を返すとき source="git-log" の DocumentAge が返る', async () => {
      // Arrange
      gitLogExecutor.mockReturnValue(Buffer.from('2026-03-10 12:00:00 +0900\n'));
      // Act
      const actual = await adapter.getAge('docs/design.md');
      // Assert
      expect(actual.source).toBe('git-log');
      expect(actual.ageInDays).toBeGreaterThanOrEqual(9);
    });

    it('execSync がエラーをスローするとき source="file-mtime" にフォールバックする', async () => {
      // Arrange
      gitLogExecutor.mockImplementation(() => {
        throw new Error('not a git repository');
      });
      // Act
      const actual = await adapter.getAge('docs/design.md');
      // Assert
      expect(actual.source).toBe('file-mtime');
    });
  });
});
