import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.ts';
import {
  ConfigNotFoundError,
  ConfigPersistenceError,
  FileSystemConfigRepository,
} from '../../../config-foundation/infrastructure/repositories/file-system-config-repository.js';
import {
  createValidSourceDocument,
  withTempDir,
  writeBrokenJsonFile,
  writeJsonFile,
} from './config-foundation-test-fixtures.js';

target('FileSystemConfigRepository', () => {
  describe('load', () => {
    context('configPathを指定した場合', () => {
      it('IT-CF-035: 絶対パスとJSONドキュメントを返すこと', async () => {
        await withTempDir(async (tempDir) => {
          // Arrange
          const repository = new FileSystemConfigRepository();
          const configPath = path.join(tempDir, 'harness.config.json');
          const document = createValidSourceDocument();
          writeJsonFile(configPath, document);

          // Act
          const actual = await repository.load(configPath);

          // Assert
          expect(actual.path).toBe(path.resolve(configPath));
          expect(actual.document).toEqual(document);
        });
      });
    });

    context('configPathを省略した場合', () => {
      it('IT-CF-036: 親ディレクトリを探索して設定ファイルを見つけること', async () => {
        await withTempDir(async (tempDir) => {
          // Arrange
          const repository = new FileSystemConfigRepository();
          const configPath = path.join(tempDir, 'harness.config.json');
          const nestedDirectory = path.join(tempDir, 'sub', 'sub2');
          const previousCwd = process.cwd();
          const document = createValidSourceDocument();
          fs.mkdirSync(nestedDirectory, { recursive: true });
          writeJsonFile(configPath, document);
          process.chdir(nestedDirectory);

          try {
            // Act
            const actual = await repository.load();

            // Assert
            expect(fs.realpathSync(actual.path)).toBe(fs.realpathSync(configPath));
            expect(actual.document).toEqual(document);
          } finally {
            process.chdir(previousCwd);
          }
        });
      });
    });

    context('loadが返すpath形式を確認する場合', () => {
      it('IT-CF-037: 常に絶対パスを返すこと', async () => {
        await withTempDir(async (tempDir) => {
          // Arrange
          const repository = new FileSystemConfigRepository();
          const configPath = path.join(tempDir, 'harness.config.json');
          writeJsonFile(configPath, createValidSourceDocument());

          // Act
          const actual = await repository.load(configPath);

          // Assert
          expect(path.isAbsolute(actual.path)).toBe(true);
        });
      });
    });

    context('対象ファイルが存在しない場合', () => {
      it('IT-CF-038: ConfigNotFoundErrorを送出すること', async () => {
        // Arrange
        const repository = new FileSystemConfigRepository();

        // Act
        const actual = repository.load('/nonexistent/path/harness.config.json');

        // Assert
        await expect(actual).rejects.toBeInstanceOf(ConfigNotFoundError);
      });
    });

    context('JSONが壊れている場合', () => {
      it('IT-CF-039: ConfigPersistenceErrorを送出すること', async () => {
        await withTempDir(async (tempDir) => {
          // Arrange
          const repository = new FileSystemConfigRepository();
          const configPath = path.join(tempDir, 'harness.config.json');
          writeBrokenJsonFile(configPath, '{ invalid json');

          // Act
          const actual = repository.load(configPath);

          // Assert
          await expect(actual).rejects.toBeInstanceOf(ConfigPersistenceError);
        });
      });
    });
  });

  describe('save', () => {
    context('新規保存する場合', () => {
      it('IT-CF-040: 2スペースJSONと改行付きで保存すること', async () => {
        await withTempDir(async (tempDir) => {
          // Arrange
          const repository = new FileSystemConfigRepository();
          const configPath = path.join(tempDir, 'harness.config.json');
          const document = createValidSourceDocument();

          // Act
          await repository.save(configPath, document);
          const actual = fs.readFileSync(configPath, 'utf8');

          // Assert
          expect(actual).toBe(`${JSON.stringify(document, null, 2)}\n`);
        });
      });
    });

    context('既存ファイルを上書きする場合', () => {
      it('IT-CF-041: 旧内容を残さず新しいJSONへ置き換えること', async () => {
        await withTempDir(async (tempDir) => {
          // Arrange
          const repository = new FileSystemConfigRepository();
          const configPath = path.join(tempDir, 'harness.config.json');
          writeJsonFile(configPath, { legacy: true });
          const nextDocument = createValidSourceDocument({
            project: {
              name: 'updated-project',
              preset: 'minimal',
            },
          });

          // Act
          await repository.save(configPath, nextDocument);
          const actual = JSON.parse(fs.readFileSync(configPath, 'utf8')) as unknown;

          // Assert
          expect(actual).toEqual(nextDocument);
        });
      });
    });

    context('書込みに失敗する場合', () => {
      it('IT-CF-042: ConfigPersistenceErrorを送出すること', async () => {
        await withTempDir(async (tempDir) => {
          // Arrange
          const repository = new FileSystemConfigRepository();
          const configPath = tempDir;

          // Act
          const actual = repository.save(configPath, createValidSourceDocument());

          // Assert
          await expect(actual).rejects.toBeInstanceOf(ConfigPersistenceError);
        });
      });
    });
  });
});
