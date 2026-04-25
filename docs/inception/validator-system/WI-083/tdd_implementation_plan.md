# TDD実装計画: H08-05 (validator-system)

## 1. スコープ
- 対象ストーリー: H08-05 L4 consistency-checkバリデータ
- 影響する層: Domain / Application / Infrastructure

## 2. 前提条件検証
- `implementation-readiness-checker` 相当の検証: ✅ 全設計文書が正規AIDLCフローで作成・検証済み（遡及記録）
- 判定結果: ✅ 実装準備完了（実装済み）

## 3. 実装状況（遡及記録）

### 実装済みファイル

**Domain層**
- `scripts/harness/validator-system/domain/value-objects/consistency-report.ts` — 整合性検証結果VO
- `scripts/harness/validator-system/domain/value-objects/validator-id.ts` — L4-002 ID定義
- `scripts/harness/validator-system/domain/services/l4/consistency-check-service.ts` — 文書間レイヤー整合性検証
- `scripts/harness/validator-system/domain/ports/design-document-port.ts`
- `scripts/harness/validator-system/domain/ports/adr-reference-port.ts`

**Application層**
- `scripts/harness/validator-system/application/use-cases/run-l4-validators-usecase.ts` — L4-002含む
- `scripts/harness/validator-system/application/use-cases/aggregate-validation-results-usecase.ts` — 結果集約UC
- `scripts/harness/validator-system/application/dto/aggregate-results-input.ts`
- `scripts/harness/validator-system/application/dto/aggregated-validation-report.ts`

**Infrastructure層**
- `scripts/harness/validator-system/infrastructure/adapters/markdown-design-document-adapter.ts`
- `scripts/harness/validator-system/infrastructure/adapters/adr-foundation-reference-adapter.ts`

### テスト状況
- ユニットテスト: ✅ 完了（`scripts/harness/__tests__/unit/validator-system/consistency-check-service.test.ts`, `consistency-report.test.ts`）
- 統合テスト: ✅ 完了（`scripts/harness/__tests__/integration/validator-system/usecases/aggregate-validation-results-usecase.test.ts`）
- E2Eテスト: ✅ 完了

## 4. QA
なし（遡及記録）
