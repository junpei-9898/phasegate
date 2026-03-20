# TDD実装計画: H14-02 (regression-suite)

## 1. スコープ
- 対象ストーリー: H14-02 K14-K15回帰テスト + エージェント非依存ガード
- 影響する層: Domain / Application / Infrastructure / テストスイート（Presentation代替）

## 2. 前提条件検証
- ✅ 実装準備完了（遡及記録）

## 3. 実装状況（遡及記録）

### 実装済みファイル

主要実装:
- `scripts/harness/regression-suite/domain/value-objects/agent-independence-test.ts`
- `scripts/harness/regression-suite/domain/value-objects/import-violation.ts`
- `scripts/harness/regression-suite/domain/services/import-guard-service.ts`
- `scripts/harness/regression-suite/domain/ports/import-analyzer-port.ts`
- `scripts/harness/regression-suite/application/usecases/run-k14-k15-regression-usecase.ts`
- `scripts/harness/regression-suite/application/usecases/run-agent-independence-guard-usecase.ts`
- `scripts/harness/regression-suite/infrastructure/adapters/biome-ast-import-analyzer-adapter.ts`

### テスト状況
- ユニットテスト: ✅ 完了（agent-independence-test, import-violation, import-guard-service）
- 統合テスト: ✅ 完了（run-k14-k15-regression-usecase.test.ts, run-agent-independence-guard-usecase.test.ts, agent-independence-integration.test.ts）
- E2Eテスト: ✅ 完了（cli-harness.test.ts regression-suite セクション）

## 4. QA
なし（遡及記録）
