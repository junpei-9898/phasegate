# シナリオテスト設計: H08-05 — L4 consistency-checkバリデータ

> **Unit ID**: validator-system
> **ストーリーID**: H08-05
> **作成日**: 2026-03-20

## 1. テスト対象CLIコマンド / 機能

L4 consistency-checkバリデータ（L4-002）の実行機能。

- 文書間のレイヤー整合性の検証（domain_model.md ⇔ logical_design.md ⇔ 実装コード）
- 設計文書間の用語不一致（エンティティ名、VO名等）の検出
- 検出時のHarnessError（L4-002）に `adr_ref` + `fix_example` + 不整合箇所の詳細を含める
- 検証対象ペア（domain_model↔logical_design, logical_design↔実装コード）が設定可能

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-VS-05-001 | domain_model.md と logical_design.md が整合している場合 | 用語統一された2文書 | passed=true |
| SC-VS-05-002 | domain_model.md と logical_design.md でエンティティ名が不一致の場合 | 異なるエンティティ名を持つ2文書 | passed=false、HarnessError(L4-002)に不整合箇所の詳細を含む |
| SC-VS-05-003 | logical_design.md と実装コードでVO名が不一致の場合 | VO名が異なる設計文書と実装 | passed=false、HarnessError(L4-002)に adr_ref + fix_example を含む |
| SC-VS-05-004 | 検証対象ペアを domain_model↔logical_design のみに絞った場合 | ペア指定='domain-logical' | 指定ペアのみ検証、他ペアはスキップ |
| SC-VS-05-005 | AggregateValidationResultsUseCaseで複数結果を集約する場合 | 複数バリデータの結果配列 | 統合レポートが正しく集約される |

## 3. テスト配置
- `scripts/harness/__tests__/integration/validator-system/usecases/run-l4-validators-usecase.test.ts`
- `scripts/harness/__tests__/integration/validator-system/usecases/aggregate-validation-results-usecase.test.ts`
- `scripts/harness/__tests__/unit/validator-system/consistency-report.test.ts`
- `scripts/harness/__tests__/unit/validator-system/consistency-check-service.test.ts`

## 4. 前提条件
- `DesignDocumentPort` が実装されていること（MarkdownDesignDocumentAdapter）
- `AdrReferencePort` が実装されていること（AdrFoundationReferenceAdapter）
- 設計文書が `docs/product/construction/{unit}/` 配下に存在すること
- `folder_management_rules.md` に準拠したファイル構造であること
