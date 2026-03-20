# TDD実装計画: H08-04 (validator-system)

## 1. スコープ
- 対象ストーリー: H08-04 L4 drift-detectバリデータ
- 影響する層: Domain / Application / Infrastructure

## 2. 前提条件検証
- `implementation-readiness-checker` 相当の検証: ✅ 全設計文書が正規AIDLCフローで作成・検証済み（遡及記録）
- 判定結果: ✅ 実装準備完了（実装済み）

## 3. 実装状況（遡及記録）

### 実装済みファイル

**Domain層**
- `scripts/harness/validator-system/domain/value-objects/drift-report.ts` — 乖離検出結果VO
- `scripts/harness/validator-system/domain/value-objects/validator-id.ts` — L4-001 ID定義
- `scripts/harness/validator-system/domain/services/l4/drift-detection-service.ts` — 双方向乖離検出ロジック
- `scripts/harness/validator-system/domain/ports/design-document-port.ts`
- `scripts/harness/validator-system/domain/ports/source-code-analyzer-port.ts`

**Application層**
- `scripts/harness/validator-system/application/use-cases/run-l4-validators-usecase.ts` — L4バリデータ実行UC
- `scripts/harness/validator-system/application/dto/run-l4-validators-input.ts`

**Infrastructure層**
- `scripts/harness/validator-system/infrastructure/adapters/markdown-design-document-adapter.ts`
- `scripts/harness/validator-system/infrastructure/adapters/biome-ast-source-code-analyzer-adapter.ts`

### テスト状況
- ユニットテスト: ✅ 完了（`scripts/harness/__tests__/unit/validator-system/drift-detection-service.test.ts`, `drift-report.test.ts`）
- 統合テスト: ✅ 完了（`scripts/harness/__tests__/integration/validator-system/usecases/run-l4-validators-usecase.test.ts`）
- E2Eテスト: ✅ 完了

## 4. QA
なし（遡及記録）
