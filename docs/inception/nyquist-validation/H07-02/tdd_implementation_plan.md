# TDD実装計画: H07-02 (nyquist-validation)

## 1. スコープ
- 対象ストーリー: H07-02 phase-gate ACマッピング完了チェック追加
- 影響する層: Domain（nyquist-validation） / Infrastructure（validator-system側アダプタ）

## 2. 前提条件検証
- `implementation-readiness-checker` 相当の検証: ✅ 全設計文書が正規AIDLCフローで作成・検証済み（遡及記録）
- 判定結果: ✅ 実装準備完了（実装済み）

## 3. 実装状況（遡及記録）

### 実装済みファイル

**Domain層（nyquist-validation）**
- `scripts/harness/nyquist-validation/domain/services/ac-coverage-gate-policy.ts` — ACマッピング完了判定ロジック
- `scripts/harness/nyquist-validation/domain/errors/story-not-found-error.ts`

**Application層（nyquist-validation）**
- `scripts/harness/nyquist-validation/application/usecases/check-ac-coverage-gate-usecase.ts`
- `scripts/harness/nyquist-validation/application/dto/check-ac-coverage-gate-input.ts`
- `scripts/harness/nyquist-validation/application/dto/check-ac-coverage-gate-output.ts`

**Infrastructure層（validator-system）**
- `scripts/harness/validator-system/infrastructure/adapters/nyquist-ac-coverage-policy-adapter.ts` — validator-systemの `AcCoveragePolicyPort` 実装

**Shared Kernel**
- `scripts/harness/shared-kernel/nyquist-validation.ts` — AcCoverageGatePolicyの公開契約エクスポート

### テスト状況
- ユニットテスト: ✅ 完了（`scripts/harness/__tests__/unit/nyquist-validation/ac-coverage-gate-policy.test.ts`）
- 統合テスト: ✅ 完了（`scripts/harness/__tests__/integration/validator-system/adapters/nyquist-ac-coverage-policy-adapter.test.ts`）
- E2Eテスト: ✅ 完了

## 4. QA
なし（遡及記録）
