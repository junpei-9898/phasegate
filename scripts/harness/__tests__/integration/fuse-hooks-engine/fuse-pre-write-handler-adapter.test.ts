import { beforeAll, describe, expect, it } from 'vitest';
import { target, context } from '../../helpers/test-helpers.js';
import { FusePreWriteHandlerAdapter } from '../../../fuse-hooks-engine/infrastructure/adapters/fuse-pre-write-handler-adapter.js';
import { ProtectedResourceList } from '../../../fuse-hooks-engine/domain/value-objects/protected-resource-list.js';

let fuseAvailable = false;

target('FusePreWriteHandlerAdapter', () => {
  beforeAll(async () => {
    fuseAvailable = await FusePreWriteHandlerAdapter.isFuseAvailable();
  });
  context('保護リソース判定', () => {
    it('IT-HF-050 デフォルト保護リソースでdocs/principles配下が保護されること', () => {
      // Arrange
      const sut = new FusePreWriteHandlerAdapter();
      // Act & Assert
      expect(sut.isProtected('docs/principles/architecture-philosophy.md')).toBe(true);
      expect(sut.isProtected('docs/principles/testing-rules.md')).toBe(true);
    });

    it('IT-HF-051 保護対象外のファイルはfalseを返すこと', () => {
      // Arrange
      const sut = new FusePreWriteHandlerAdapter();
      // Act & Assert
      expect(sut.isProtected('src/index.ts')).toBe(false);
      expect(sut.isProtected('docs/inception/story.md')).toBe(false);
    });

    it('IT-HF-052 カスタム保護リソースリストで判定できること', () => {
      // Arrange
      const protectedResources = ProtectedResourceList.create([
        '**/*.env',
        'secrets/**',
      ])._unsafeUnwrap();
      const sut = new FusePreWriteHandlerAdapter({ protectedResources });
      // Act & Assert
      expect(sut.isProtected('.env')).toBe(true);
      expect(sut.isProtected('secrets/api-key.txt')).toBe(true);
      expect(sut.isProtected('src/main.ts')).toBe(false);
    });
  });

  context('ハンドラ登録・ディスパッチ', () => {
    it('IT-HF-053 ハンドラを登録してディスパッチできること', async () => {
      // Arrange
      const sut = new FusePreWriteHandlerAdapter();
      const dispatched: string[] = [];
      await sut.register('/mnt/project', {
        handle: async (filePath, eventType) => {
          dispatched.push(`${eventType}:${filePath}`);
        },
      });
      // Act
      await sut.dispatch('/mnt/project', 'src/index.ts', 'write');
      // Assert
      expect(dispatched).toEqual(['write:src/index.ts']);
    });

    it('IT-HF-054 未登録のマウントパスにディスパッチしてもエラーにならないこと', async () => {
      // Arrange
      const sut = new FusePreWriteHandlerAdapter();
      // Act & Assert (no throw)
      await sut.dispatch('/nonexistent', 'src/index.ts', 'write');
    });
  });

  context('FUSE可用性チェック', () => {
    it('IT-HF-055 isFuseAvailableが真偽値を返すこと', async () => {
      // Act
      const available = await FusePreWriteHandlerAdapter.isFuseAvailable();
      // Assert
      expect(typeof available).toBe('boolean');
    });
  });

  context('FUSEマウント', () => {
    it('IT-HF-056 FUSE未インストール時にmountがFUSE_NOT_AVAILABLEエラーを返すこと', async (ctx) => {
      if (fuseAvailable) {
        ctx.skip();
        return;
      }
      // Arrange
      const sut = new FusePreWriteHandlerAdapter();
      // Act & Assert
      await expect(sut.mount('/tmp/source', '/tmp/mount')).rejects.toThrow();
    });
  });
});
