# シナリオテストロジック設計: H08-01

> **Unit ID**: validator-system
> **作成日**: 2026-03-20
> **対応テストケース**: SC-VS-01-001〜SC-VS-01-005

## 1. テストヘルパー

- `target(name, fn)` / `context(name, fn)` — `scripts/harness/__tests__/helpers/test-helpers.ts` で定義されたAAAパターンテスト構造ヘルパー
- `createAggregatedReport(opts)` — `scripts/harness/__tests__/integration/validator-system/helpers.ts` で定義された集約レポート生成ファクトリ
- `vi.fn().mockResolvedValue(...)` — Vitestモック、UseCaseをスタブ化

## 2. テストケース疑似コード

```typescript
// SC-VS-01-001: 全UseCase passの場合
target('RunValidatorsHandler', () => {
  context('全UseCaseがpassの場合', () => {
    it('output出力ありかつexitCode=0が返る', async () => {
      // Arrange
      const mockRunFullUseCase = {
        execute: vi.fn().mockResolvedValue(
          createAggregatedReport({ overallPassed: true, totalValidators: 10, failedValidators: 0 })
        ),
      };
      const handler = new RunValidatorsHandler({ runFullValidationUseCase: mockRunFullUseCase });

      // Act
      const actual = await handler.execute({ layer: 'all', unit: 'validator-system', phase: 'implementation' });

      // Assert
      expect(actual.output.length).toBeGreaterThan(0);
      expect(actual.exitCode).toBe(0);
    });
  });

  // SC-VS-01-002: --format ci
  context('--format ciを渡した場合', () => {
    it('JSON形式でoutput出力される', async () => {
      // Arrange: mockUseCase with overallPassed=true
      // Act: handler.execute({ format: 'ci', ... })
      // Assert: JSON.parse(actual.output) should not throw
    });
  });

  // SC-VS-01-004: ValidatorExecutionError時
  context('UseCaseがValidatorExecutionErrorをthrowする場合', () => {
    it('exitCode=2が返る', async () => {
      // Arrange: mockUseCase that throws ValidatorExecutionError
      // Act: handler.execute({ ... })
      // Assert: actual.exitCode === 2, actual.output contains error message
    });
  });

  // SC-VS-01-005: バリデーション失敗時
  context('failedValidatorsが1以上の場合', () => {
    it('exitCode=1が返る', async () => {
      // Arrange: createAggregatedReport({ overallPassed: false, failedValidators: 2 })
      // Act: handler.execute({ ... })
      // Assert: actual.exitCode === 1
    });
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/integration/validator-system/handlers/run-validators-handler.test.ts
npx vitest run scripts/harness/__tests__/unit/validator-system/
```
