# シナリオテストロジック設計: H07-03

> **Unit ID**: nyquist-validation
> **作成日**: 2026-03-20
> **対応テストケース**: SC-NQ-03-001〜SC-NQ-03-005

## 1. テストヘルパー

- `target(name, fn)` / `context(name, fn)` — `scripts/harness/__tests__/helpers/test-helpers.ts` のテスト構造ヘルパー
- `vi.fn()` — CoverageThresholdPortのスタブ化（config-foundationアダプタ）
- `CoverageResult.create(...)` — カバレッジ算出結果VOのファクトリ

## 2. テストケース疑似コード

```typescript
// SC-NQ-03-001: 全ACマッピング済み
target('CoverageCalculationService', () => {
  context('全ACがマッピング済みの場合', () => {
    it('coverageRate=100%、uncoveredAcs=[] のCoverageResultが返る', async () => {
      // Arrange
      const matrix = RequirementTestMatrix.create({
        storyMappings: [
          StoryMapping.create({ storyId: 'H07-01', acMappings: [
            AcMapping.create({ acId: 'AC-1', testReferences: [{ filePath: 'foo.test.ts', testType: 'unit' }] }),
            AcMapping.create({ acId: 'AC-2', testReferences: [{ filePath: 'bar.test.ts', testType: 'it' }] }),
          ]})
        ]
      });
      const service = new CoverageCalculationService();

      // Act
      const actual = service.calculate(matrix);

      // Assert
      expect(actual.coverageRate).toBe(100);
      expect(actual.uncoveredAcs).toHaveLength(0);
    });
  });

  // SC-NQ-03-002: AC網羅率不足
  context('AC網羅率が100%未満の場合', () => {
    it('coverageRate<100、uncoveredAcs に未カバーACが含まれる', async () => {
      // Arrange: 3AC中1件がtestReferences=[]
      // Act: service.calculate(matrix)
      // Assert: actual.coverageRate < 100, actual.uncoveredAcs includes 'AC-2'
    });
  });
});

// SC-NQ-03-003: standardプリセット閾値
target('CalculateCoverageUseCase', () => {
  context('standardプリセットの場合', () => {
    it('output.codeThreshold が 90 になる', async () => {
      // Arrange: coverageThresholdPort returns 90 (standard)
      // Act: useCase.execute(...)
      // Assert: actual.codeThreshold === 90
    });
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/coverage-calculation-service.test.ts
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/coverage-result.test.ts
```
