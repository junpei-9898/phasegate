# ユニットテストロジック設計計画: nyquist-validation

> **作成日**: 2026-03-19
> **Wave**: 2

## 1. スコープ

- **対象**: `docs/product/construction/nyquist-validation/unit_test_design.md`
- **テストケース総数**: 127件
- **実装先ソース**: `scripts/harness/` 配下（Wave 2新規 Unit）

## 2. テストファイル構成（計画）

| テストファイル | 対象クラス | ケース数 |
|--------------|----------|---------|
| `scripts/harness/__tests__/unit/nyquist-validation/requirement-test-matrix.test.ts` | RequirementTestMatrix（集約） | 27 |
| `scripts/harness/__tests__/unit/nyquist-validation/story-mapping.test.ts` | StoryMapping（エンティティ） | 12 |
| `scripts/harness/__tests__/unit/nyquist-validation/ac-mapping.test.ts` | AcMapping（VO） | 14 |
| `scripts/harness/__tests__/unit/nyquist-validation/test-reference.test.ts` | TestReference（VO） | 12 |
| `scripts/harness/__tests__/unit/nyquist-validation/coverage-result.test.ts` | CoverageResult（VO） | 14 |
| `scripts/harness/__tests__/unit/nyquist-validation/impact-analysis-result.test.ts` | ImpactAnalysisResult（VO） | 9 |
| `scripts/harness/__tests__/unit/nyquist-validation/ac-coverage-gate-policy.test.ts` | AcCoverageGatePolicy（DS） | 10 |
| `scripts/harness/__tests__/unit/nyquist-validation/coverage-calculation-service.test.ts` | CoverageCalculationService（DS） | 9 |
| `scripts/harness/__tests__/unit/nyquist-validation/impact-analysis-service.test.ts` | ImpactAnalysisService（DS） | 7 |
| `scripts/harness/__tests__/unit/nyquist-validation/matrix-validation-service.test.ts` | MatrixValidationService（DS） | 8 |

※横断境界値(UT-BND-*)は各ファイルに分散して記載（15件）

## 3. モック/ファクトリ設計方針

### ファクトリ関数配置

`scripts/harness/__tests__/helpers/test-helpers.ts` に追加：

- `createTestReference(overrides?)`: デフォルト `{ filePath: "scripts/harness/__tests__/unit/foo.test.ts", testType: "unit" }`
- `createAcMapping(acId?, refs?)`: デフォルト `AC-1` + TestReference 1件
- `createStoryMapping(storyId?, acMappings?)`: デフォルト `H07-01` + AcMapping 1件
- `createRequirementTestMatrix(storyMappings?)`: デフォルト 1件の StoryMapping で初期化
- `createCoverageResult(overrides?)`: デフォルト rate=1.0

### モック方針

- **VO・エンティティ・集約**: モック不使用（実体を直接生成）
- **ドメインサービスのポート**: `vi.fn()` でモック
  - `MatrixValidationService`: `StoryRegistryPort` をモック
  - `AcCoverageGatePolicy`, `CoverageCalculationService`, `ImpactAnalysisService`: ポート依存なし（純粋計算、モック不要）

## 4. QA（不明点・確認事項）

なし

## 5. 前提条件・リスク

- `RequirementTestMatrix` は集約（INV-1〜4）を持つが、永続化層は別Unitが担うためここでは生成/状態テストのみ
- `CoverageCalculationService` は外部依存なし（純粋計算）—モックなし
- `ImpactAnalysisService` も外部依存なし—モックなし
- `MatrixValidationService` のみ `StoryRegistryPort` をモックする
- `coveredAcCount > totalAcCount` の不正状態は CoverageResult 生成時にバリデートする
