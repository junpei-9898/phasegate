# UseCase テストパターン・テンプレート

本ファイルは `it-test-logic-designer` スキルで使用するUseCaseレイヤーのテストテンプレート集。

---

## UseCase テストテンプレート

### ファイル: `{usecase}.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { target, context } from '../../helpers/common-helper.js';
import { {UseCase} } from '../../../src/{context}/application/usecases/{usecase}.js';
import { {Repository}Port } from '../../../src/{context}/application/ports/{repository}-port.js';

target('{UseCase}', () => {
  let useCase: {UseCase};
  let mockRepository: {Repository}Port;

  beforeEach(() => {
    // モックRepository作成
    mockRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      // ...
    };
    useCase = new {UseCase}(mockRepository);
  });

  // IT-UC-{Name}-001: 正常系
  describe('execute', () => {
    context('有効な入力の場合', () => {
      it('処理が成功し結果が返される', async () => {
        // Arrange
        const input = {
          // UseCaseへの入力
        };
        mockRepository.findById.mockResolvedValue(create{Entity}({}));

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.isSuccess()).toBe(true);
        expect(actual.value.{property}).toBe({expectedValue});
        expect(mockRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ /* 期待されるエンティティ */ })
        );
      });
    });

    // IT-UC-{Name}-002: 異常系（バリデーションエラー）
    context('無効な入力の場合', () => {
      it('バリデーションエラーが返される', async () => {
        // Arrange
        const invalidInput = {
          // 無効な入力
        };

        // Act
        const actual = await useCase.execute(invalidInput);

        // Assert
        expect(actual.isFailure()).toBe(true);
        expect(actual.error.code).toBe('{ERROR_CODE}');
      });
    });

    // IT-UC-{Name}-003: 異常系（リソース不存在）
    context('対象リソースが存在しない場合', () => {
      it('NotFoundエラーが返される', async () => {
        // Arrange
        mockRepository.findById.mockResolvedValue(null);
        const input = { id: 'non-existent-id' };

        // Act
        const actual = await useCase.execute(input);

        // Assert
        expect(actual.isFailure()).toBe(true);
        expect(actual.error.code).toBe('NOT_FOUND');
      });
    });
  });
});
```
