// @layer test
// @unit phase2-extensions
// @story H08-01
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { FileSystemDocumentScannerAdapter } from '../../../phase2-extensions/infrastructure/adapters/file-system-document-scanner-adapter.js';

target('IT-P2-005 FileSystemDocumentScannerAdapter', () => {
  let tmpDir: string;
  let adapter: FileSystemDocumentScannerAdapter;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'phase2-ext-scan-'));
    await fs.mkdir(path.join(tmpDir, 'docs/adr'), { recursive: true });
    adapter = new FileSystemDocumentScannerAdapter(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  context('scan(pattern)', () => {
    it('Glob パターンに一致する 2 件のファイルが返る', async () => {
      // Arrange
      await fs.writeFile(path.join(tmpDir, 'docs/adr/0001.md'), '');
      await fs.writeFile(path.join(tmpDir, 'docs/adr/0002.md'), '');
      // Act
      const actual = await adapter.scan('docs/adr/**/*.md');
      // Assert
      expect(actual).toHaveLength(2);
    });

    it('node_modules 内のファイルは結果に含まれない', async () => {
      // Arrange
      await fs.mkdir(path.join(tmpDir, 'node_modules'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'node_modules/readme.md'), '');
      await fs.writeFile(path.join(tmpDir, 'docs/adr/0001.md'), '');
      // Act
      const actual = await adapter.scan('**/*.md');
      // Assert
      expect(actual.every((entry) => !entry.includes('node_modules'))).toBe(true);
    });

    it('excludePatterns に一致するファイルは結果に含まれない', async () => {
      // Arrange
      await fs.mkdir(path.join(tmpDir, 'docs/inception/WI-001'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'docs/guide'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'docs/inception/WI-001/plan.md'), '');
      await fs.writeFile(path.join(tmpDir, 'docs/guide/configuration.md'), '');
      adapter = new FileSystemDocumentScannerAdapter(tmpDir, {
        excludePatterns: [/^docs\/inception\//],
      });

      // Act
      const actual = await adapter.scan('docs/**/*.md');

      // Assert
      expect(actual).toEqual(['docs/guide/configuration.md']);
    });
  });
});
