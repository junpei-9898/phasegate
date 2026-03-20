# シナリオテストロジック設計: H08-04

> **Unit ID**: validator-system
> **作成日**: 2026-03-20
> **対応テストケース**: SC-VS-04-001〜SC-VS-04-005

## 1. テストヘルパー

- `target(name, fn)` / `context(name, fn)` — `scripts/harness/__tests__/helpers/test-helpers.ts` のテスト構造ヘルパー
- `vi.fn()` — DesignDocumentPort, SourceCodeAnalyzerPortのスタブ化
- DriftReportファクトリ — 乖離方向・対象要素・推奨アクションの生成

## 2. テストケース疑似コード

```typescript
// SC-VS-04-001: 乖離なし
target('DriftDetectionService', () => {
  context('設計とコードが一致している場合', () => {
    it('passed=true のDriftReportが返る', async () => {
      // Arrange
      const designPort = { readDesignDocument: vi.fn().mockResolvedValue({ entities: ['Foo'], vos: ['Bar'] }) };
      const codePort = { analyzeSourceCode: vi.fn().mockResolvedValue({ exports: ['Foo', 'Bar'] }) };
      const service = new DriftDetectionService({ designPort, codePort });

      // Act
      const actual = await service.detect({ unitName: 'myUnit' });

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.drifts).toHaveLength(0);
    });
  });

  // SC-VS-04-002: 設計→コード方向の乖離
  context('設計文書にあるがコードにない要素がある場合', () => {
    it('direction="design-to-code"のdriftを含むDriftReportが返る', async () => {
      // Arrange: designPort returns { entities: ['Foo', 'Missing'] }, codePort returns { exports: ['Foo'] }
      // Act: service.detect({ unitName: 'myUnit' })
      // Assert: actual.drifts[0].direction === 'design-to-code', actual.drifts[0].element === 'Missing'
    });
  });

  // SC-VS-04-003: コード→設計方向の乖離
  context('コードにあるが設計文書にない要素がある場合', () => {
    it('direction="code-to-design"のdriftを含むDriftReportが返る', async () => {
      // Arrange: codePort has 'Extra' not in designPort
      // Act: service.detect(...)
      // Assert: drift.direction === 'code-to-design', drift.recommendedAction contains suggestion
    });
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/unit/validator-system/drift-detection-service.test.ts
npx vitest run scripts/harness/__tests__/unit/validator-system/drift-report.test.ts
npx vitest run scripts/harness/__tests__/integration/validator-system/usecases/run-l4-validators-usecase.test.ts
```
