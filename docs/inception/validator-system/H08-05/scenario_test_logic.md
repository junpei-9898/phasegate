# シナリオテストロジック設計: H08-05

> **Unit ID**: validator-system
> **作成日**: 2026-03-20
> **対応テストケース**: SC-VS-05-001〜SC-VS-05-005

## 1. テストヘルパー

- `target(name, fn)` / `context(name, fn)` — `scripts/harness/__tests__/helpers/test-helpers.ts` のテスト構造ヘルパー
- `vi.fn()` — DesignDocumentPort, AdrReferencePortのスタブ化
- ConsistencyReportファクトリ — 不一致箇所・検証対象ペアの生成

## 2. テストケース疑似コード

```typescript
// SC-VS-05-001: domain_model↔logical_design 整合
target('ConsistencyCheckService', () => {
  context('domain_model.md と logical_design.md が整合している場合', () => {
    it('passed=true のConsistencyReportが返る', async () => {
      // Arrange
      const designPort = {
        readDomainModel: vi.fn().mockResolvedValue({ entities: ['ValidatorDefinition'] }),
        readLogicalDesign: vi.fn().mockResolvedValue({ components: ['ValidatorDefinition'] }),
      };
      const service = new ConsistencyCheckService({ designPort, adrPort });

      // Act
      const actual = await service.check({ unitName: 'validator-system', pairs: ['domain-logical'] });

      // Assert
      expect(actual.passed).toBe(true);
      expect(actual.inconsistencies).toHaveLength(0);
    });
  });

  // SC-VS-05-002: エンティティ名不一致
  context('domain_model.md と logical_design.md でエンティティ名が異なる場合', () => {
    it('L4-002エラーに不整合箇所の詳細が含まれる', async () => {
      // Arrange: domainModel has 'ValidatorDef', logicalDesign has 'ValidatorDefinition'
      // Act: service.check(...)
      // Assert: actual.inconsistencies[0].pair === 'domain-logical'
      //         actual.inconsistencies[0].mismatch contains 'ValidatorDef vs ValidatorDefinition'
    });
  });

  // SC-VS-05-005: AggregateValidationResultsUseCase
  target('AggregateValidationResultsUseCase', () => {
    it('複数バリデータの結果を集約して統合レポートを返す', () => {
      // Arrange: results = [{ validatorId: 'L4-001', passed: true }, { validatorId: 'L4-002', passed: false }]
      // Act: useCase.execute({ results })
      // Assert: report.overallPassed === false, report.failedValidators === 1
    });
  });
});
```

## 3. テスト実行コマンド

```bash
npx vitest run scripts/harness/__tests__/unit/validator-system/consistency-check-service.test.ts
npx vitest run scripts/harness/__tests__/unit/validator-system/consistency-report.test.ts
npx vitest run scripts/harness/__tests__/integration/validator-system/usecases/aggregate-validation-results-usecase.test.ts
```
