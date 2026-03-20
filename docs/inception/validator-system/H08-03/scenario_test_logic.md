# シナリオテストロジック設計: H08-03

> **Unit ID**: validator-system
> **作成日**: 2026-03-20
> **対応テストケース**: SC-VS-03-001〜SC-VS-03-005

## 1. テストヘルパー

- `target(name, fn)` / `context(name, fn)` — `scripts/harness/__tests__/helpers/test-helpers.ts` のテスト構造ヘルパー
- `vi.fn()` — CoverageReportPort, ValidatorConfigPortのスタブ化
- LayerConfigのファクトリ関数 — standardプリセット・strictプリセットの設定値生成

## 2. テストケース疑似コード

```typescript
// SC-VS-03-001: standardプリセット、カバレッジ90%以上
target('RunL3ValidatorsUseCase（coverageバリデータ）', () => {
  context('standardプリセットでカバレッジ90%以上の場合', () => {
    it('passed=true の ValidationResult が返る', async () => {
      // Arrange
      const coveragePort = { getCoverageReport: vi.fn().mockResolvedValue({ coverage: 92 }) };
      const configPort = { getLayerConfig: vi.fn().mockResolvedValue(
        LayerConfig.create({ preset: 'standard', coverageThreshold: 90 })
      )};
      const useCase = new RunL3ValidatorsUseCase({ coveragePort, configPort, ... });

      // Act
      const actual = await useCase.execute({ targetPaths: [], unitName: 'u', currentPhase: 'impl' });

      // Assert
      expect(actual.find(r => r.validatorId === 'L3-003')?.passed).toBe(true);
    });
  });

  // SC-VS-03-002: standardプリセット、カバレッジ不足
  context('standardプリセットでカバレッジ90%未満の場合', () => {
    it('L3-003エラーに現在値と不足分が含まれる', async () => {
      // Arrange: coverage=88, threshold=90
      // Act: useCase.execute(...)
      // Assert: errors[0].code === 'L3-003', errors[0].context contains { current: 88, shortage: 2 }
    });
  });

  // SC-VS-03-004: strictプリセット、カバレッジ不足
  context('strictプリセットでカバレッジ95%未満の場合', () => {
    it('L3-003エラーに現在値と不足分が含まれる', async () => {
      // Arrange: coverage=91, threshold=95
      // Act: useCase.execute(...)
      // Assert: errors[0].context contains { current: 91, shortage: 4 }
    });
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/integration/validator-system/usecases/run-l3-validators-usecase.test.ts
npx vitest run scripts/harness/__tests__/unit/validator-system/layer-config.test.ts
```
