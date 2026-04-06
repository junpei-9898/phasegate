// @layer test
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
  });
});
