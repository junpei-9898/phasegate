# シナリオテストロジック設計: H08-02

> **Unit ID**: validator-system
> **作成日**: 2026-03-20
> **対応テストケース**: SC-VS-02-001〜SC-VS-02-006

## 1. テストヘルパー

- `target(name, fn)` / `context(name, fn)` — `scripts/harness/__tests__/helpers/test-helpers.ts` のテスト構造ヘルパー
- `vi.fn()` — L3バリデータポートのスタブ化（SecurityPatternScannerPort, PerformanceScannerPort）
- `createAggregatedReport(opts)` — `scripts/harness/__tests__/integration/validator-system/helpers.ts`

## 2. テストケース疑似コード

```typescript
// SC-VS-02-001: セキュリティパターンなし
target('RunL3ValidatorsUseCase', () => {
  context('セキュリティ違反がない場合', () => {
    it('passed=true の ValidationResult が返る', async () => {
      // Arrange
      const securityPort = { scan: vi.fn().mockResolvedValue([]) };
      const performancePort = { scan: vi.fn().mockResolvedValue([]) };
      const useCase = new RunL3ValidatorsUseCase({ securityPort, performancePort, configPort });

      // Act
      const actual = await useCase.execute({ targetPaths: ['src/'], unitName: 'myUnit', currentPhase: 'impl' });

      // Assert
      expect(actual.every(r => r.passed)).toBe(true);
    });
  });

  // SC-VS-02-002: APIキー検出
  context('ハードコードされたAPIキーが存在する場合', () => {
    it('L3-001エラーを含むValidationResultが返る', async () => {
      // Arrange: securityPort returns [HarnessError(L3-001)]
      // Act: useCase.execute({ ... })
      // Assert: actual contains ValidationResult with passed=false, errors containing L3-001
    });
  });

  // SC-VS-02-004: strictプリセット限定チェック
  context('standardプリセットの場合', () => {
    it('bundleSizeLimitチェックがスキップされる', async () => {
      // Arrange: configPort returns preset='standard'
      // Act: useCase.execute({ ... })
      // Assert: bundleSize check not called
    });
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/integration/validator-system/usecases/run-l3-validators-usecase.test.ts
npx vitest run scripts/harness/__tests__/unit/validator-system/validation-rule.test.ts
```
