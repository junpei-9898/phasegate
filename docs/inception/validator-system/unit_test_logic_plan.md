# ユニットテストロジック設計計画: validator-system

> **作成日**: 2026-03-19
> **Wave**: 2

## 1. スコープ

- **対象**: `docs/product/construction/validator-system/unit_test_design.md`
- **テストケース総数**: 約151件（VO×8クラス 79件 + ドメインサービス×5 48件 + 境界値 17件 + BND 7件）
- **実装先ソース**: `scripts/harness/` 配下（Wave 2新規 Unit）

## 2. テストファイル構成（計画）

| テストファイル | 対象クラス | ケース数 |
|--------------|----------|---------|
| `scripts/harness/__tests__/unit/validator-system/validator-id.test.ts` | ValidatorId (VO) | 23 |
| `scripts/harness/__tests__/unit/validator-system/validator-definition.test.ts` | ValidatorDefinition (VO) | 12 |
| `scripts/harness/__tests__/unit/validator-system/validation-rule.test.ts` | ValidationRule (VO) | 7 |
| `scripts/harness/__tests__/unit/validator-system/validation-result.test.ts` | ValidationResult (VO) | 12 |
| `scripts/harness/__tests__/unit/validator-system/layer-config.test.ts` | LayerConfig (VO) | 11 |
| `scripts/harness/__tests__/unit/validator-system/drift-report.test.ts` | DriftReport (VO) | 8 |
| `scripts/harness/__tests__/unit/validator-system/consistency-report.test.ts` | ConsistencyReport (VO) | 7 |
| `scripts/harness/__tests__/unit/validator-system/dead-code-report.test.ts` | DeadCodeReport (VO) | 7 |
| `scripts/harness/__tests__/unit/validator-system/validator-registry.test.ts` | ValidatorRegistry (DS) | 15 |
| `scripts/harness/__tests__/unit/validator-system/validator-execution-service.test.ts` | ValidatorExecutionService (DS) | 12 |
| `scripts/harness/__tests__/unit/validator-system/drift-detection-service.test.ts` | DriftDetectionService (DS) | 6 |
| `scripts/harness/__tests__/unit/validator-system/consistency-check-service.test.ts` | ConsistencyCheckService (DS) | 5 |
| `scripts/harness/__tests__/unit/validator-system/dead-code-detection-service.test.ts` | DeadCodeDetectionService (DS) | 7 |

※境界値ケース(UT-BND-*)は各ファイルに分散して記載

## 3. モック/ファクトリ設計方針

### ファクトリ関数配置

既存ヘルパー `scripts/harness/__tests__/helpers/test-helpers.ts` に以下を追加：

- `createValidatorId(value?: string)`: デフォルト `"L2-001"`
- `createValidatorDefinition(overrides?)`: デフォルト L2-001 定義
- `createValidationRule(overrides?)`: デフォルト有効ルール
- `createValidationResult(overrides?)`: デフォルト passed=true
- `createLayerConfig(overrides?)`: デフォルト L2 enabled=true
- `createDriftReport(overrides?)`: デフォルト design→code 方向
- `createValidatorRegistry(defs?)`: 10件の全バリデータ定義で初期化

### モック方針

- **VOクラス**: モック不使用（実体を直接生成）
- **ドメインサービスのポート**: `vi.fn()` で全Portをモック
  - `ValidatorConfigPort`, `PhaseGatePolicyPort`, `TestQualityPort` 等
  - `DesignDocumentPort`, `SourceCodeAnalyzerPort`, `AdrReferencePort`, `SourceAnalysisPort`
- **ドメインサービス間の依存**: 実体またはモックの選択可（単純なため実体推奨）

## 4. QA（不明点・確認事項）

なし（上位設計文書が揃っており、方針は明確）

## 5. 前提条件・リスク

- ValidatorId の名前マッピング（`getName()`）はドメインモデルの `VALIDATOR_NAME_MAP` に依存
  - `"L2-001"` → `"phase-gate"`, `"L3-003"` → `"coverage"`, `"L4-001"` → `"drift-detect"`, `"L4-003"` → `"dead-code"` 等
- ValidatorExecutionService は Portインターフェースを通じてバリデータを実行するため、ポートモックが必須
- `executeWithRelaxation()` メソッドが ValidatorRelaxationProfile を受け取る（quick-mode との連携）
