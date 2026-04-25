# シナリオテストロジック設計: H08-06

> **Unit ID**: validator-system
> **作成日**: 2026-03-20
> **対応テストケース**: SC-VS-06-001〜SC-VS-06-006

## 1. テストヘルパー

- `target(name, fn)` / `context(name, fn)` — `scripts/harness/__tests__/helpers/test-helpers.ts` のテスト構造ヘルパー
- `vi.fn()` — SourceAnalysisPort, ValidatorConfigPortのスタブ化
- DeadCodeReportファクトリ — 未使用エクスポート・行番号情報の生成

## 2. テストケース疑似コード

```typescript
// SC-VS-06-001: strictプリセット、デッドコードなし
target('DeadCodeDetectionService', () => {
  context('strictプリセットで全エクスポートが使用されている場合', () => {
    it('passed=true のDeadCodeReportが返る', async () => {
      // Arrange
      const sourceAnalysisPort = {
        getImportGraph: vi.fn().mockResolvedValue({ exports: ['Foo'], importedBy: { Foo: ['bar.ts'] } }),
      };
      const configPort = { getLayerConfig: vi.fn().mockResolvedValue(LayerConfig.create({ preset: 'strict' })) };
      const service = new DeadCodeDetectionService({ sourceAnalysisPort, configPort });

      // Act
      const actual = await service.detect({ targetPaths: ['src/'] });

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.unusedExports).toHaveLength(0);
    });
  });

  // SC-VS-06-002: 未使用エクスポート検出
  context('strictプリセットで未使用エクスポートがある場合', () => {
    it('L4-003エラーにファイルパスと行番号が含まれる', async () => {
      // Arrange: importGraph.importedBy['UnusedClass'] === [] (誰もimportしていない)
      // Act: service.detect(...)
      // Assert: actual.unusedExports[0].filePath, actual.unusedExports[0].lineNumber
    });
  });

  // SC-VS-06-004: standardプリセット時のスキップ
  context('standardプリセットの場合', () => {
    it('dead-codeバリデータが無効化される', async () => {
      // Arrange: configPort returns preset='standard' (deadCodeGC=false)
      // Act: runL4Validators useCase with standard config
      // Assert: DeadCodeDetectionService.detect not called
    });
  });

  // SC-VS-06-005: RunFullValidationUseCase
  target('RunFullValidationUseCase', () => {
    it('includeL4=true のとき L4バリデータを含む全レイヤーを実行する', async () => {
      // Arrange: all ports mocked
      // Act: useCase.execute({ includeL4: true, ... })
      // Assert: report includes L2/L3/L4 results
    });

    it('includeL4=false のとき L4バリデータをスキップする', async () => {
      // Arrange: all ports mocked
      // Act: useCase.execute({ includeL4: false, ... })
      // Assert: report does NOT include L4 results
    });
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/unit/validator-system/dead-code-detection-service.test.ts
npx vitest run scripts/harness/__tests__/unit/validator-system/dead-code-report.test.ts
npx vitest run scripts/harness/__tests__/integration/validator-system/usecases/run-l4-validators-usecase.test.ts
npx vitest run scripts/harness/__tests__/integration/validator-system/usecases/run-full-validation-usecase.test.ts
```
