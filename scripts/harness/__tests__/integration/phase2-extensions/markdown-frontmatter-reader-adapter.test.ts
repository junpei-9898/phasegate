// @layer test
// @unit phase2-extensions
// @story HF2-04
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { MarkdownFrontmatterReaderAdapter } from '../../../phase2-extensions/infrastructure/adapters/markdown-frontmatter-reader-adapter.js';

target('IT-P2-052〜054 MarkdownFrontmatterReaderAdapter', () => {
  let tmpDir: string;
  let adapter: MarkdownFrontmatterReaderAdapter;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hf2-04-fm-'));
    adapter = new MarkdownFrontmatterReaderAdapter(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  context('read(filePath)', () => {
    it('traceability.initial_creation: true を読み取る', async () => {
      // Arrange
      await fs.writeFile(
        path.join(tmpDir, 'a.md'),
        '---\ntraceability:\n  initial_creation: true\n---\n本文\n',
      );

      // Act
      const actual = await adapter.read('a.md');

      // Assert
      expect(actual.flags).not.toBeNull();
      expect(actual.flags?.initialCreation).toBe(true);
      expect(actual.parseError).toBeNull();
    });

    it('frontmatter 無しのとき initialCreation=false を返す', async () => {
      // Arrange
      await fs.writeFile(path.join(tmpDir, 'b.md'), '# 本文のみ\n');

      // Act
      const actual = await adapter.read('b.md');

      // Assert
      expect(actual.flags?.initialCreation).toBe(false);
      expect(actual.parseError).toBeNull();
    });

    it('YAML 不正のとき parseError が設定される', async () => {
      // Arrange
      await fs.writeFile(
        path.join(tmpDir, 'c.md'),
        '---\ntraceability:\n  initial_creation: maybe\n---\n',
      );

      // Act
      const actual = await adapter.read('c.md');

      // Assert
      expect(actual.flags).toBeNull();
      expect(actual.parseError).not.toBeNull();
    });
  });
});
