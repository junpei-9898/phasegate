# シナリオテストロジック設計: H07-02

> **Unit ID**: nyquist-validation
> **作成日**: 2026-03-20
> **対応テストケース**: SC-NQ-02-001〜SC-NQ-02-004

## 1. テストヘルパー

- `target(name, fn)` / `context(name, fn)` — `scripts/harness/__tests__/helpers/test-helpers.ts` のテスト構造ヘルパー
- `vi.fn()` — AcCoveragePolicyPortのスタブ化（validator-system側のアダプタテスト用）
- `RequirementTestMatrix.create(...)` — 集約ルートのファクトリ

## 2. テストケース疑似コード

```typescript
// SC-NQ-02-001: 全ACがマッピング済み
target('AcCoverageGatePolicy', () => {
  context('全ACがマッピング済みの場合', () => {
    it('passed=true が返る', () => {
      // Arrange
      const matrix = RequirementTestMatrix.create({
        storyMappings: [
          StoryMapping.create({ storyId: 'H07-01', acMappings: [
            AcMapping.create({ acId: 'AC-1', testReferences: [{ filePath: 'foo.test.ts', testType: 'unit' }] }),
          ]})
        ]
      });
      const policy = new AcCoverageGatePolicy();

      // Act
      const actual = policy.check(matrix);

      // Assert
      expect(actual.passed).toBe(true);
    });
  });

  // SC-NQ-02-002: 未マッピングACあり
  context('未マッピングのACがある場合', () => {
    it('passed=false、未マッピングAC一覧を含むHarnessErrorが返る', () => {
      // Arrange: matrix with AC-1 mapped, AC-2 not mapped (testReferences=[])
      // Act: policy.check(matrix)
      // Assert: actual.passed === false, actual.unmappedAcs contains 'AC-2'
    });
  });
});

// SC-NQ-02-004: NyquistAcCoveragePolicyAdapter
target('NyquistAcCoveragePolicyAdapter', () => {
  it('AcCoverageGatePolicyの結果がvalidator-systemのAcCoveragePolicyPortに正しく委譲される', async () => {
    // Arrange
    const mockMatrix = { /* valid matrix */ };
    const adapter = new NyquistAcCoveragePolicyAdapter({ analyzeImpactUseCase });

    // Act
    const actual = await adapter.checkAcCoverage(mockMatrix);

    // Assert
    expect(actual).toMatchObject({ passed: true });
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/ac-coverage-gate-policy.test.ts
npx vitest run scripts/harness/__tests__/integration/validator-system/adapters/nyquist-ac-coverage-policy-adapter.test.ts
```
