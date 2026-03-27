import { beforeAll, describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { FusePreReadHandlerAdapter } from '../../../fuse-hooks-engine/infrastructure/adapters/fuse-pre-read-handler-adapter.js';

let fuseAvailable = false;

target('FusePreReadHandlerAdapter', () => {
  beforeAll(async () => {
    fuseAvailable = await FusePreReadHandlerAdapter.isFuseAvailable();
  });
  context('機密ファイルパターンマッチ', () => {
    it('IT-HF-060 .envファイルが機密判定されること', () => {
      // Arrange
      const sut = new FusePreReadHandlerAdapter();
      // Act & Assert
      expect(sut.isSensitiveFile('.env')).toBe(true);
      expect(sut.isSensitiveFile('.env.local')).toBe(true);
      expect(sut.isSensitiveFile('.env.production')).toBe(true);
    });

    it('IT-HF-061 鍵ファイルが機密判定されること', () => {
      // Arrange
      const sut = new FusePreReadHandlerAdapter();
      // Act & Assert
      expect(sut.isSensitiveFile('server.key')).toBe(true);
      expect(sut.isSensitiveFile('cert.pem')).toBe(true);
      expect(sut.isSensitiveFile('keystore.p12')).toBe(true);
      expect(sut.isSensitiveFile('cert.pfx')).toBe(true);
    });

    it('IT-HF-062 credentials/secretsファイルが機密判定されること', () => {
      // Arrange
      const sut = new FusePreReadHandlerAdapter();
      // Act & Assert
      expect(sut.isSensitiveFile('credentials.json')).toBe(true);
      expect(sut.isSensitiveFile('secrets.json')).toBe(true);
      expect(sut.isSensitiveFile('secret.json')).toBe(true);
      expect(sut.isSensitiveFile('api.secret')).toBe(true);
    });

    it('IT-HF-063 通常ファイルは機密判定されないこと', () => {
      // Arrange
      const sut = new FusePreReadHandlerAdapter();
      // Act & Assert
      expect(sut.isSensitiveFile('src/index.ts')).toBe(false);
      expect(sut.isSensitiveFile('package.json')).toBe(false);
      expect(sut.isSensitiveFile('README.md')).toBe(false);
      expect(sut.isSensitiveFile('docs/design.md')).toBe(false);
    });

    it('IT-HF-064 カスタムパターンで機密判定できること', () => {
      // Arrange
      const sut = new FusePreReadHandlerAdapter({
        sensitivePatterns: [/\.token$/, /\.jwt$/],
      });
      // Act & Assert
      expect(sut.isSensitiveFile('auth.token')).toBe(true);
      expect(sut.isSensitiveFile('session.jwt')).toBe(true);
      expect(sut.isSensitiveFile('.env')).toBe(false); // デフォルトパターンなし
    });
  });

  context('ハンドラ登録・ディスパッチ', () => {
    it('IT-HF-065 ハンドラを登録してディスパッチできること', async () => {
      // Arrange
      const sut = new FusePreReadHandlerAdapter();
      const dispatched: string[] = [];
      await sut.register('/mnt/project', {
        handle: async (filePath, eventType) => {
          dispatched.push(`${eventType}:${filePath}`);
        },
      });
      // Act
      await sut.dispatch('/mnt/project', 'src/index.ts', 'read');
      // Assert
      expect(dispatched).toEqual(['read:src/index.ts']);
    });
  });

  context('FUSEマウント', () => {
    it('IT-HF-066 FUSE未インストール時にmountがエラーを返すこと', async (ctx) => {
      if (fuseAvailable) {
        ctx.skip();
        return;
      }
      // Arrange
      const sut = new FusePreReadHandlerAdapter();
      // Act & Assert
      await expect(sut.mount('/tmp/source', '/tmp/mount')).rejects.toThrow();
    });
  });
});
