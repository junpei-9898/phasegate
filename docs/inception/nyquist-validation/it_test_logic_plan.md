# ITテストロジック設計計画: nyquist-validation

## 1. スコープ

- 対象テストケース設計: `docs/product/construction/nyquist-validation/it_test_design.md`
- 参照論理設計: `docs/product/construction/nyquist-validation/logical_design.md`
- テストケース総数: 約82件
  - UseCase: 33件（ValidateMatrix×10, CheckACGate×8, CalcCoverage×8, AnalyzeImpact×7）
  - Adapter: 26件（FileSystemMatrix×9, StoryRegistry×4, Threshold×5, AjvValidator×8）
  - Handler: 23件（ValidateHandler×6, CheckACGateHandler×5, CalcCoverageHandler×6, AnalyzeImpactHandler×6）

---

## 2. テストファイル構成（計画）

| テストファイル | 対象コンポーネント | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/integration/nyquist-validation/usecase/validate-matrix-usecase.it.test.ts` | ValidateMatrixUseCase | 10 |
| `scripts/harness/__tests__/integration/nyquist-validation/usecase/check-ac-coverage-gate-usecase.it.test.ts` | CheckAcCoverageGateUseCase | 8 |
| `scripts/harness/__tests__/integration/nyquist-validation/usecase/calculate-coverage-usecase.it.test.ts` | CalculateCoverageUseCase | 8 |
| `scripts/harness/__tests__/integration/nyquist-validation/usecase/analyze-impact-usecase.it.test.ts` | AnalyzeImpactUseCase | 7 |
| `scripts/harness/__tests__/integration/nyquist-validation/adapter/file-system-matrix-file-adapter.it.test.ts` | FileSystemMatrixFileAdapter | 9 |
| `scripts/harness/__tests__/integration/nyquist-validation/adapter/traceability-model-story-registry-adapter.it.test.ts` | TraceabilityModelStoryRegistryAdapter | 4 |
| `scripts/harness/__tests__/integration/nyquist-validation/adapter/config-foundation-coverage-threshold-adapter.it.test.ts` | ConfigFoundationCoverageThresholdAdapter | 5 |
| `scripts/harness/__tests__/integration/nyquist-validation/adapter/ajv-json-schema-validator-adapter.it.test.ts` | AjvJsonSchemaValidatorAdapter | 8 |
| `scripts/harness/__tests__/integration/nyquist-validation/handler/validate-matrix-handler.it.test.ts` | ValidateMatrixHandler | 6 |
| `scripts/harness/__tests__/integration/nyquist-validation/handler/check-ac-coverage-gate-handler.it.test.ts` | CheckAcCoverageGateHandler | 5 |
| `scripts/harness/__tests__/integration/nyquist-validation/handler/calculate-coverage-handler.it.test.ts` | CalculateCoverageHandler | 6 |
| `scripts/harness/__tests__/integration/nyquist-validation/handler/analyze-impact-handler.it.test.ts` | AnalyzeImpactHandler | 6 |

---

## 3. モック・フィクスチャ設計方針

### UseCase テスト（ポートのみモック）
- `MatrixFilePort`, `StoryRegistryPort`, `CoverageThresholdPort`, `AjvJsonSchemaValidatorAdapter` → `vi.fn()` でモック
- `MatrixValidationService`, `CoverageCalculationService`, `ImpactAnalysisService`, `AcCoverageGatePolicy` → 実体を使用（Domain層モック禁止）
- `AcCoverageGatePolicy` は UseCase 内でインスタンス化されるため、モック対象は `AcCoveragePolicyPort`

### Adapter テスト
- **FileSystemMatrixFileAdapter**: `vi.mock("node:fs/promises")` でファイルI/Oをモック
- **TraceabilityModelStoryRegistryAdapter**: `vi.mock()` で Wave 1 traceability-model 共有カーネルをスタブ化
- **ConfigFoundationCoverageThresholdAdapter**: `vi.mock()` で Wave 1 config-foundation 共有カーネルをスタブ化
- **AjvJsonSchemaValidatorAdapter**: 実体使用（外部依存なし。ajvライブラリのみ依存）

### Handler テスト（UseCaseをモック）
- 各 UseCase を `vi.fn()` でモック
- `process.exit` / `process.stdout.write` / `process.stderr.write` を `vi.spyOn()` でキャプチャ
- 終了コード: pass→0、fail→1、error→2

### シードデータ配置
```
scripts/harness/__tests__/integration/nyquist-validation/fixtures/
├── valid-full-coverage.json          # 全AC網羅済みmatrix
├── valid-partial-coverage.json       # 75%カバー（4AC中3AC）
├── valid-no-coverage.json            # 全AC未カバー
├── valid-empty-stories.json          # stories: []
├── invalid-missing-required.json     # acId欠損
├── invalid-wrong-testtype.json       # testType: "e2e"
├── invalid-acid-format.json          # acId: "AC-0"
├── invalid-unknown-storyid.json      # storyId: "H99-99"
├── invalid-duplicate-storyid.json    # 重複storyId
├── valid-duplicate-testrefs.json     # 重複testReference
└── valid-impact-analysis.json        # H07-01に3AC・複数TestRef
```

---

## 4. テストヘルパー設計

### インポートパス
- `usecase/` サブディレクトリからは `../../../../helpers/test-helpers`（4段階）
- `adapter/` / `handler/` サブディレクトリからも `../../../../helpers/test-helpers`（4段階）

### 共通ファクトリ（インライン定義）
- `createValidateMatrixInput(overrides?)`: ValidateMatrixUseCase入力のデフォルト値
- `createStoryRegistryMock()`: StoryRegistryPortのデフォルトモック（有効storyIds付き）
- `createAjvValidatorMock(valid?)`: AjvValidatorのデフォルトモック

---

## 5. QA（不明点・確認事項）

なし。it_test_design.md にモック方針・ファイル構成・フィクスチャ要件が詳細に記述されている。

---

## 6. 前提条件・リスク

- **Wave 1 依存**: traceability-model と config-foundation は実装済み。`vi.mock()` でスタブ可能
- **ajv ^10.0.0**: AjvJsonSchemaValidatorAdapterは外部ライブラリajvを実体使用。テストはスキーマファイルをメモリ上で定義
- **@storyアノテーション**: 各テストファイル先頭に `// @story H07-XX` を付与する
- **DB不要**: LocalCLIツールのためデータベース接続は不要
- **インポートパスネスト**: `usecase/`・`adapter/`・`handler/` すべて4段階（`../../../../helpers/test-helpers`）
