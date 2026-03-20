# TDD実装計画: H08-06 (validator-system)

## 1. スコープ
- 対象ストーリー: H08-06 L4 dead-codeバリデータ
- 影響する層: Domain / Application / Infrastructure / Presentation

## 2. 前提条件検証
- `implementation-readiness-checker` 相当の検証: ✅ 全設計文書が正規AIDLCフローで作成・検証済み（遡及記録）
- 判定結果: ✅ 実装準備完了（実装済み）

## 3. 実装状況（遡及記録）

### 実装済みファイル

**Domain層**
- `scripts/harness/validator-system/domain/value-objects/dead-code-report.ts` — 未使用コード検出結果VO
- `scripts/harness/validator-system/domain/value-objects/validator-id.ts` — L4-003 ID定義
- `scripts/harness/validator-system/domain/services/l4/dead-code-detection-service.ts` — 未使用エクスポート・到達不能コード検出
- `scripts/harness/validator-system/domain/ports/source-analysis-port.ts`

**Application層**
- `scripts/harness/validator-system/application/use-cases/run-l4-validators-usecase.ts` — L4-003含む
- `scripts/harness/validator-system/application/use-cases/run-full-validation-usecase.ts` — 全レイヤー一括実行UC
- `scripts/harness/validator-system/application/dto/run-full-validation-input.ts`

**Infrastructure層**
- `scripts/harness/validator-system/infrastructure/adapters/import-graph-source-analysis-adapter.ts`

**Presentation層**
- `scripts/harness/validator-system/presentation/handlers/run-validators-handler.ts` — `includeL4`/`noL4` フラグ制御
- `scripts/harness/validator-system/presentation/handlers/run-quick-mode-handler.ts` — Quickモード実行ハンドラー
- `scripts/harness/validator-system/presentation/handlers/report-validation-results-handler.ts`

### テスト状況
- ユニットテスト: ✅ 完了（`scripts/harness/__tests__/unit/validator-system/dead-code-detection-service.test.ts`, `dead-code-report.test.ts`）
- 統合テスト: ✅ 完了（`scripts/harness/__tests__/integration/validator-system/usecases/run-full-validation-usecase.test.ts`, `run-quick-mode-usecase.test.ts`）
- E2Eテスト: ✅ 完了

## 4. QA
なし（遡及記録）
