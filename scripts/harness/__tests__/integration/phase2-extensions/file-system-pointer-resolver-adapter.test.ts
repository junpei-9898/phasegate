// @layer test
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { context, target } from '../../helpers/test-helpers.js';
import { createFilePathPointer, createUrlPointer } from '../../helpers/phase2-extensions-test-factories.js';
import { FileSystemPointerResolverAdapter } from '../../../phase2-extensions/infrastructure/adapters/file-system-pointer-resolver-adapter.js';

target('IT-P2-007 FileSystemPointerResolverAdapter', () => {
  let tmpDir: string;
  let adapter: FileSystemPointerResolverAdapter;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'phase2-ext-resolve-'));
    await fs.mkdir(path.join(tmpDir, 'docs'), { recursive: true });
    adapter = new FileSystemPointerResolverAdapter(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  context('resolve(pointer)', () => {
    it('実在するファイルパスの Pointer に対して true が返る', async () => {
      // Arrange
      await fs.writeFile(path.join(tmpDir, 'docs/design.md'), '');
      const pointer = createFilePathPointer({ target: 'docs/design.md' });
      // Act
      const actual = await adapter.resolve(pointer);
      // Assert
      expect(actual).toBe(true);
    });

    it('URL タイプの Pointer に対して常に true が返る', async () => {
      // Arrange
      const pointer = createUrlPointer();
      // Act
      const actual = await adapter.resolve(pointer);
      // Assert
      expect(actual).toBe(true);
    });
  });
});
