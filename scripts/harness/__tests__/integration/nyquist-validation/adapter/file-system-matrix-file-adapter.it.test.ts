// @layer test
import { expect, it } from 'vitest';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { target, context } from '../../../helpers/test-helpers.js';
import { FileSystemMatrixFileAdapter } from '../../../../nyquist-validation/infrastructure/adapters/file-system-matrix-file-adapter.js';
import { createValidFullCoverageMatrixData } from '../nyquist-validation-test-fixtures.js';

async function createTempDir() {
  const dirPath = join(tmpdir(), `nyquist-validation-${randomUUID()}`);
  await mkdir(dirPath, { recursive: true });
  return dirPath;
}

target('FileSystemMatrixFileAdapter', () => {
  context('read操作を行う場合', () => {
    it('有効なJSONファイルパスを渡すと、JSONパース済みのオブジェクトが返ること', async () => {
      // Arrange
      const dirPath = await createTempDir();
      const filePath = join(dirPath, 'valid.json');
      const expected = createValidFullCoverageMatrixData();
      await writeFile(filePath, JSON.stringify(expected, null, 2), 'utf-8');
      const adapter = new FileSystemMatrixFileAdapter();

      // Act
      const actual = await adapter.read(filePath);

      // Assert
      expect(actual).toEqual(expected);
    });

    it('存在しないファイルパスを渡すと、エラーがthrowされること', async () => {
      // Arrange
      const adapter = new FileSystemMatrixFileAdapter();
      const dirPath = await createTempDir();
      const filePath = join(dirPath, 'not-found.json');

      // Act & Assert
      await expect(adapter.read(filePath)).rejects.toThrow('ENOENT');
    });

    it('壊れたJSONのファイルパスを渡すと、MatrixValidationFailedErrorがthrowされること', async () => {
      // Arrange
      const dirPath = await createTempDir();
      const filePath = join(dirPath, 'broken.json');
      await writeFile(filePath, '{ invalid json', 'utf-8');
      const adapter = new FileSystemMatrixFileAdapter();

      // Act & Assert
      await expect(adapter.read(filePath)).rejects.toThrow(/JSONパース失敗|MatrixValidationFailed/);
    });

    it('空ファイルを渡すと、MatrixValidationFailedErrorがthrowされること', async () => {
      // Arrange
      const dirPath = await createTempDir();
      const filePath = join(dirPath, 'empty.json');
      await writeFile(filePath, '', 'utf-8');
      const adapter = new FileSystemMatrixFileAdapter();

      // Act & Assert
      await expect(adapter.read(filePath)).rejects.toThrow(/JSONパース失敗|MatrixValidationFailed/);
    });
  });

  context('write操作を行う場合', () => {
    it('有効なファイルパスとデータを渡すと、JSON.stringify(data,null,2)形式で書き込まれること', async () => {
      // Arrange
      const dirPath = await createTempDir();
      const filePath = join(dirPath, 'matrix.json');
      const data = createValidFullCoverageMatrixData();
      const adapter = new FileSystemMatrixFileAdapter();

      // Act
      await adapter.write(filePath, data);
      const actual = await readFile(filePath, 'utf-8');

      // Assert
      expect(actual).toBe(JSON.stringify(data, null, 2));
    });

    it('存在しない親ディレクトリへの書き込みではエラーがthrowされること', async () => {
      // Arrange
      const dirPath = await createTempDir();
      const filePath = join(dirPath, 'missing', 'matrix.json');
      const adapter = new FileSystemMatrixFileAdapter();

      // Act & Assert
      await expect(adapter.write(filePath, createValidFullCoverageMatrixData())).rejects.toThrow();
    });

    it('相対パスを渡した場合、相対パスのまま処理されること', async () => {
      // Arrange
      const dirPath = await createTempDir();
      const cwd = process.cwd();
      process.chdir(dirPath);
      const filePath = './relative.json';
      const data = createValidFullCoverageMatrixData();
      const adapter = new FileSystemMatrixFileAdapter();

      // Act
      await adapter.write(filePath, data);
      const actual = await adapter.read(filePath);

      // Assert
      expect(actual).toEqual(data);
      process.chdir(cwd);
    });
  });

  context('read/write往復を行う場合', () => {
    it('write後にreadすると同一データが返ること', async () => {
      // Arrange
      const dirPath = await createTempDir();
      const filePath = join(dirPath, 'roundtrip.json');
      const data = createValidFullCoverageMatrixData();
      const adapter = new FileSystemMatrixFileAdapter();

      // Act
      await adapter.write(filePath, data);
      const actual = await adapter.read(filePath);

      // Assert
      expect(actual).toEqual(data);
    });

    it('writeが途中でエラーになった場合、エラーがthrowされること', async () => {
      // Arrange
      const adapter = new FileSystemMatrixFileAdapter();
      const dirPath = await createTempDir();
      const filePath = join(dirPath, 'nested', 'out', 'matrix.json');

      // Act & Assert
      await expect(adapter.write(filePath, createValidFullCoverageMatrixData())).rejects.toThrow();
    });
  });
});

// @story-id H08-07