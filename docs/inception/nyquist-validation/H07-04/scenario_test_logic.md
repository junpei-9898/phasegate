# シナリオテストロジック設計: H07-04

> **Unit ID**: nyquist-validation
> **作成日**: 2026-03-20
> **対応テストケース**: SC-NQ-04-001〜SC-NQ-04-004

## 1. テストヘルパー

- `target(name, fn)` / `context(name, fn)` — `scripts/harness/__tests__/helpers/test-helpers.ts` のテスト構造ヘルパー
- `vi.fn()` — MatrixFilePortのスタブ化（FileSystemMatrixFileAdapter）
- `ImpactAnalysisResult.create(...)` — テストケース逆引き結果VOのファクトリ

## 2. テストケース疑似コード

```typescript
// SC-NQ-04-001: 存在するstoryId
target('ImpactAnalysisService', () => {
  context('指定storyIdがmatrixに存在する場合', () => {
    it('ImpactAnalysisResultにテストケース一覧が含まれる', async () => {
      // Arrange
      const matrix = RequirementTestMatrix.create({
        storyMappings: [
          StoryMapping.create({ storyId: 'H07-01', acMappings: [
            AcMapping.create({ acId: 'AC-1', testReferences: [
              { filePath: 'foo.test.ts', testType: 'unit' },
              { filePath: 'bar.test.ts', testType: 'it' },
            ]})
          ]})
        ]
      });
      const service = new ImpactAnalysisService();

      // Act
      const actual = service.analyze(matrix, 'H07-01');

      // Assert
      expect(actual.storyId).toBe('H07-01');
      expect(actual.testReferences).toHaveLength(2);
      expect(actual.testReferences[0].testType).toBe('unit');
    });
  });

  // SC-NQ-04-002: 存在しないstoryId
  context('指定storyIdがmatrixに存在しない場合', () => {
    it('StoryNotFoundError がthrowされる', () => {
      // Arrange: matrix without 'H99-99'
      // Act
      const actual = () => service.analyze(matrix, 'H99-99');
      // Assert
      expect(actual).toThrow(StoryNotFoundError);
    });
  });
});

// SC-NQ-04-004: harness-apiアダプタ
target('NyquistValidationImpactAnalysisAdapter', () => {
  it('AnalyzeImpactUseCaseを正しく委譲してImpactAnalysisResultを返す', async () => {
    // Arrange
    const mockUseCase = { execute: vi.fn().mockResolvedValue({ storyId: 'H07-01', testReferences: [] }) };
    const adapter = new NyquistValidationImpactAnalysisAdapter({ analyzeImpactUseCase: mockUseCase });

    // Act
    const actual = await adapter.analyzeImpact('H07-01');

    // Assert
    expect(actual.storyId).toBe('H07-01');
    expect(mockUseCase.execute).toHaveBeenCalledWith({ storyId: 'H07-01' });
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/impact-analysis-service.test.ts
npx vitest run scripts/harness/__tests__/unit/nyquist-validation/impact-analysis-result.test.ts
npx vitest run scripts/harness/__tests__/integration/harness-api/nyquist-validation-impact-analysis-adapter.test.ts
```
