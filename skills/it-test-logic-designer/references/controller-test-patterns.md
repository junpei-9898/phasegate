# Controller テストパターン・テンプレート

本ファイルは `it-test-logic-designer` スキルで使用するController/APIレイヤーのテストテンプレート集。

---

## Controller テストテンプレート

### ファイル: `{controller}.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { target, context } from '../../helpers/common-helper.js';
import { {Controller} } from '../../../src/{context}/interfaces/controllers/{controller}.js';
import { createMockCallableContext } from '../../helpers/firebase-test-helper.js';

target('{Controller}', () => {
  let controller: {Controller};
  let mockUseCase: {UseCase};

  beforeEach(() => {
    mockUseCase = {
      execute: vi.fn(),
    };
    controller = new {Controller}(mockUseCase);
  });

  // IT-API-{Name}-001: 認証テスト
  describe('認証', () => {
    context('未認証ユーザーの場合', () => {
      it('UNAUTHENTICATEDエラーが返される', async () => {
        // Arrange
        const ctx = createMockCallableContext({ auth: null });
        const data = { /* リクエストデータ */ };

        // Act & Assert
        await expect(controller.handle(data, ctx))
          .rejects.toThrow('UNAUTHENTICATED');
      });
    });
  });

  // IT-API-{Name}-002: 認可テスト
  describe('認可', () => {
    context('権限のないユーザーの場合', () => {
      it('PERMISSION_DENIEDエラーが返される', async () => {
        // Arrange
        const ctx = createMockCallableContext({
          auth: { uid: 'user-001', role: 'VIEWER' },
        });
        const data = { /* リクエストデータ */ };

        // Act & Assert
        await expect(controller.handle(data, ctx))
          .rejects.toThrow('PERMISSION_DENIED');
      });
    });
  });

  // IT-API-{Name}-003: バリデーションテスト
  describe('バリデーション', () => {
    context('必須フィールドが欠落している場合', () => {
      it('INVALID_ARGUMENTエラーが返される', async () => {
        // Arrange
        const ctx = createMockCallableContext({
          auth: { uid: 'user-001', role: 'ADMIN' },
        });
        const data = { /* 不完全なデータ */ };

        // Act & Assert
        await expect(controller.handle(data, ctx))
          .rejects.toThrow('INVALID_ARGUMENT');
      });
    });
  });

  // IT-API-{Name}-004: 正常系
  describe('正常系', () => {
    it('UseCaseが実行され結果が返される', async () => {
      // Arrange
      const ctx = createMockCallableContext({
        auth: { uid: 'user-001', role: 'ADMIN' },
      });
      const data = { /* 有効なリクエストデータ */ };
      mockUseCase.execute.mockResolvedValue(
        Result.ok({ /* UseCase結果 */ })
      );

      // Act
      const actual = await controller.handle(data, ctx);

      // Assert
      expect(mockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ /* 期待される入力 */ })
      );
      expect(actual).toEqual({ /* 期待されるレスポンス */ });
    });
  });
});
```
