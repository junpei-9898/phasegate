# TDD実装計画: H15-01 (regression-suite)

## 1. スコープ
- 対象ストーリー: H15-01 v0 143テスト仕様のv1再実装
- 影響する層: Domain / Application / Infrastructure

## 2. 前提条件検証
- ✅ 実装準備完了（遡及記録）

## 3. 実装状況（遡及記録）

### 実装済みファイル

主要実装:
- `scripts/harness/regression-suite/domain/aggregates/v0-test-migration.ts`
- `scripts/harness/regression-suite/domain/value-objects/migration-mapping.ts`
- `scripts/harness/regression-suite/domain/value-objects/biome-modification-spec.ts`
- `scripts/harness/regression-suite/domain/value-objects/v0-test-id.ts`
- `scripts/harness/regression-suite/domain/value-objects/v1-test-path.ts`
- `scripts/harness/regression-suite/domain/services/migration-analyzer.ts`
- `scripts/harness/regression-suite/domain/ports/v0-spec-reader-port.ts`
- `scripts/harness/regression-suite/domain/ports/migration-mapping-repository-port.ts`
- `scripts/harness/regression-suite/application/usecases/analyze-v0-migration-usecase.ts`
- `scripts/harness/regression-suite/application/usecases/migrate-v0-tests-usecase.ts`
- `scripts/harness/regression-suite/infrastructure/adapters/file-system-v0-spec-reader-adapter.ts`
- `scripts/harness/regression-suite/infrastructure/adapters/markdown-migration-mapping-repository-adapter.ts`

成果物: `docs/product/construction/regression-suite/v0_v1_test_mapping.md`（v0→v1テスト対応表）

### テスト状況
- ユニットテスト: ✅ 完了（v0-test-migration, migration-mapping, biome-modification-spec, migration-analyzer）
- 統合テスト: ✅ 完了（analyze-v0-migration-usecase.test.ts, migrate-v0-tests-usecase.test.ts, v0-migration-integration.test.ts）
- E2Eテスト: ✅ 完了（cli-harness.test.ts regression-suite セクション）

## 4. QA
なし（遡及記録）
