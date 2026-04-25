# TDD実装計画: H07-01 (nyquist-validation)

## 1. スコープ
- 対象ストーリー: H07-01 requirement-test-matrix.json新設
- 影響する層: Domain / Application / Infrastructure

## 2. 前提条件検証
- `implementation-readiness-checker` 相当の検証: ✅ 全設計文書が正規AIDLCフローで作成・検証済み（遡及記録）
- 判定結果: ✅ 実装準備完了（実装済み）

## 3. 実装状況（遡及記録）

### 実装済みファイル

**Domain層**
- `scripts/harness/nyquist-validation/domain/aggregates/requirement-test-matrix.ts` — 集約ルート
- `scripts/harness/nyquist-validation/domain/entities/story-mapping.ts` — ストーリー単位エンティティ
- `scripts/harness/nyquist-validation/domain/value-objects/ac-mapping.ts` — AC ID → TestReference[] VO
- `scripts/harness/nyquist-validation/domain/value-objects/test-reference.ts` — ファイルパス + テスト種別 VO
- `scripts/harness/nyquist-validation/domain/errors/invalid-ac-id-format-error.ts`
- `scripts/harness/nyquist-validation/domain/errors/duplicate-story-mapping-error.ts`
- `scripts/harness/nyquist-validation/domain/errors/invalid-test-type-error.ts`
- `scripts/harness/nyquist-validation/domain/errors/empty-file-path-error.ts`
- `scripts/harness/nyquist-validation/domain/errors/matrix-validation-failed-error.ts`
- `scripts/harness/nyquist-validation/domain/services/matrix-validation-service.ts`
- `scripts/harness/nyquist-validation/domain/ports/matrix-file-port.ts`
- `scripts/harness/nyquist-validation/domain/ports/story-registry-port.ts`

**Application層**
- `scripts/harness/nyquist-validation/application/usecases/validate-matrix-usecase.ts`
- `scripts/harness/nyquist-validation/application/dto/validate-matrix-input.ts`
- `scripts/harness/nyquist-validation/application/dto/validate-matrix-output.ts`

**Infrastructure層**
- `scripts/harness/nyquist-validation/infrastructure/adapters/ajv-json-schema-validator-adapter.ts`
- `scripts/harness/nyquist-validation/infrastructure/adapters/traceability-model-story-registry-adapter.ts`
- `scripts/harness/nyquist-validation/infrastructure/adapters/file-system-matrix-file-adapter.ts`
- `scripts/harness/nyquist-validation/infrastructure/schema/` — requirement-test-matrix.schema.json

### テスト状況
- ユニットテスト: ✅ 完了（`scripts/harness/__tests__/unit/nyquist-validation/` 配下: requirement-test-matrix, matrix-validation-service, ac-mapping, test-reference, story-mapping）
- 統合テスト: ✅ 完了
- E2Eテスト: ✅ 完了

## 4. QA
なし（遡及記録）
