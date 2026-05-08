// @layer test
// @unit phase2-extensions
// @story H08-01
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { RegexPointerExtractorAdapter } from '../../../phase2-extensions/infrastructure/adapters/regex-pointer-extractor-adapter.js';

target('IT-P2-006 RegexPointerExtractorAdapter', () => {
  let tmpDir: string;
  let adapter: RegexPointerExtractorAdapter;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'phase2-ext-pointer-'));
    adapter = new RegexPointerExtractorAdapter(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  context('extract(documentPath)', () => {
    it('Markdown リンクが file-path ポインタとして抽出される', async () => {
      // Arrange
      await fs.writeFile(path.join(tmpDir, 'test.md'), '[設計書](docs/design.md)\n');
      // Act
      const actual = await adapter.extract('test.md');
      // Assert
      expect(actual.some((pointer) => pointer.type === 'file-path' && pointer.target === 'docs/design.md')).toBe(true);
    });

    it('URL リンクが url ポインタとして抽出される', async () => {
      // Arrange
      await fs.writeFile(path.join(tmpDir, 'test.md'), '[GitHub](https://github.com/)\n');
      // Act
      const actual = await adapter.extract('test.md');
      // Assert
      expect(actual.some((pointer) => pointer.type === 'url' && pointer.target === 'https://github.com/')).toBe(true);
    });

    it('Markdown の相対リンクとアンカーがプロジェクト相対パスに正規化される', async () => {
      // Arrange
      await fs.mkdir(path.join(tmpDir, 'docs/guide'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'docs/guide/configuration.md'), '[CLI](./cli-reference.md#validate)\n');

      // Act
      const actual = await adapter.extract('docs/guide/configuration.md');

      // Assert
      expect(actual.some((pointer) => pointer.target === 'docs/guide/cli-reference.md')).toBe(true);
    });

    it('アンカーのみ・テンプレート・glob は file-path ポインタとして抽出しない', async () => {
      // Arrange
      await fs.writeFile(
        path.join(tmpDir, 'test.md'),
        [
          '[section](#known-limitations)',
          '`scripts/harness/{unit}/*.ts`',
          'docs/inception/{unit}/...',
          'scripts/harness/配下の.tsファイル',
        ].join('\n'),
      );

      // Act
      const actual = await adapter.extract('test.md');

      // Assert
      expect(actual).toHaveLength(0);
    });

    it('Markdown構文の説明用 placeholder は file-path ポインタとして抽出しない', async () => {
      // Arrange
      await fs.writeFile(
        path.join(tmpDir, 'test.md'),
        ['Markdown link syntax: [text](path)', 'Sample target: [設計書](sample-design-md)'].join('\n'),
      );

      // Act
      const actual = await adapter.extract('test.md');

      // Assert
      expect(actual).toHaveLength(0);
    });

    it('絶対パスと行番号サフィックスを正規化して抽出する', async () => {
      // Arrange
      await fs.writeFile(path.join(tmpDir, 'test.md'), '[source](/repo/docs/design.md:56)\n');

      // Act
      const actual = await adapter.extract('test.md');

      // Assert
      expect(actual.some((pointer) => pointer.target === '/repo/docs/design.md')).toBe(true);
    });
  });
});
