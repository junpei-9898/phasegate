# ITテストロジック設計計画: validator-system

## 1. スコープ

- 対象テストケース設計: `docs/product/construction/validator-system/it_test_design.md`
- 参照論理設計: `docs/product/construction/validator-system/logical_design.md`
- テストケース総数: 約105件
  - UseCase: 37件（RunL2×7, RunL3×7, RunL4×6, RunQuick×5, Aggregate×8, RunFull×5）
  - Infrastructure Adapter: 46件（12 Adapters）
  - CLI Handler: 22件（3 Handlers）

---

## 2. テストファイル構成（計画）

| テストファイル | 対象コンポーネント | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/integration/validator-system/usecases/run-l2-validators-usecase.test.ts` | RunL2ValidatorsUseCase | 7 |
| `scripts/harness/__tests__/integration/validator-system/usecases/run-l3-validators-usecase.test.ts` | RunL3ValidatorsUseCase | 7 |
| `scripts/harness/__tests__/integration/validator-system/usecases/run-l4-validators-usecase.test.ts` | RunL4ValidatorsUseCase | 6 |
| `scripts/harness/__tests__/integration/validator-system/usecases/run-quick-mode-usecase.test.ts` | RunQuickModeUseCase | 5 |
| `scripts/harness/__tests__/integration/validator-system/usecases/aggregate-validation-results-usecase.test.ts` | AggregateValidationResultsUseCase | 8 |
| `scripts/harness/__tests__/integration/validator-system/usecases/run-full-validation-usecase.test.ts` | RunFullValidationUseCase | 5 |
| `scripts/harness/__tests__/integration/validator-system/adapters/harness-config-validator-config-adapter.test.ts` | HarnessConfigValidatorConfigAdapter | 8 |
| `scripts/harness/__tests__/integration/validator-system/adapters/phase-dependency-phase-gate-policy-adapter.test.ts` | PhaseDependencyPhaseGatePolicyAdapter | 4 |
| `scripts/harness/__tests__/integration/validator-system/adapters/traceability-metadata-policy-adapter.test.ts` | TraceabilityMetadataPolicyAdapter | 6 |
| `scripts/harness/__tests__/integration/validator-system/adapters/biome-ast-test-quality-analyzer-adapter.test.ts` | BiomeAstTestQualityAnalyzerAdapter | 7 |
| `scripts/harness/__tests__/integration/validator-system/adapters/file-system-security-pattern-scanner-adapter.test.ts` | FileSystemSecurityPatternScannerAdapter | 4 |
| `scripts/harness/__tests__/integration/validator-system/adapters/ast-performance-scanner-adapter.test.ts` | AstPerformanceScannerAdapter | 3 |
| `scripts/harness/__tests__/integration/validator-system/adapters/json-coverage-report-adapter.test.ts` | JsonCoverageReportAdapter | 4 |
| `scripts/harness/__tests__/integration/validator-system/adapters/nyquist-ac-coverage-policy-adapter.test.ts` | NyquistAcCoveragePolicyAdapter | 2 |
| `scripts/harness/__tests__/integration/validator-system/adapters/markdown-design-document-adapter.test.ts` | MarkdownDesignDocumentAdapter | 4 |
| `scripts/harness/__tests__/integration/validator-system/adapters/biome-ast-source-code-analyzer-adapter.test.ts` | BiomeAstSourceCodeAnalyzerAdapter | 2 |
| `scripts/harness/__tests__/integration/validator-system/adapters/import-graph-source-analysis-adapter.test.ts` | ImportGraphSourceAnalysisAdapter | 2 |
| `scripts/harness/__tests__/integration/validator-system/adapters/adr-foundation-reference-adapter.test.ts` | AdrFoundationReferenceAdapter | 4 |
| `scripts/harness/__tests__/integration/validator-system/handlers/run-validators-handler.test.ts` | RunValidatorsHandler | 10 |
| `scripts/harness/__tests__/integration/validator-system/handlers/run-quick-mode-handler.test.ts` | RunQuickModeHandler | 7 |
| `scripts/harness/__tests__/integration/validator-system/handlers/report-validation-results-handler.test.ts` | ReportValidationResultsHandler | 5 |

---

## 3. モック・フィクスチャ設計方針

### UseCase テスト（ポートのみモック）
- `ValidatorConfigPort`, `PhaseGatePolicyPort`, `MetadataPolicyPort` などポートインターフェースを `vi.fn()` でモック
- `ValidatorExecutionService` / `AggregateValidationService` は実体を使用（Domain層モック禁止）
- AggregateValidationResultsUseCaseは純粋集約のためモック不要

### Adapter テスト（外部依存をモック）
- `biome-ast-engine` / `phase-dependency-model` / `nyquist-validation` / `adr-foundation`：`vi.mock()` で共有カーネルをスタブ化
- ファイルシステム依存（config/metadata/coverage）：tmpディレクトリへの実ファイル書き込み + `afterEach`クリーンアップ

### CLI Handler テスト
- UseCaseを `vi.fn()` でモック
- `process.exit` を `vi.spyOn(process, 'exit')` でキャプチャ
- `process.stdout.write` / `process.stderr.write` を `vi.spyOn()` で出力キャプチャ

### シードデータ配置
```
scripts/harness/__tests__/integration/validator-system/fixtures/
├── valid-harness-config.json      # standard preset
├── strict-harness-config.json     # strict preset
├── minimal-harness-config.json    # L3 disabled
├── valid-metadata-file.ts         # @unit + @layer + @story-id
├── missing-unit-file.ts           # @unit なし
├── valid-test-file.test.ts        # AAA + actual + 日本語テスト名
├── invalid-test-file.test.ts      # result変数・英語テスト名
├── secure-source.ts               # セキュリティ問題なし
├── insecure-source.ts             # API_KEY ハードコード
├── coverage-summary.json          # overallCoverage=92
├── low-coverage-summary.json      # overallCoverage=85
├── domain_model.md                # ADR参照付き最小ドキュメント
└── relaxation-profile.json        # RunQuickModeHandler用
```

---

## 4. テストヘルパー設計

### インポート
```typescript
import { target, context } from '../../../helpers/test-helpers';
```

### 共通ファクトリ（インライン定義）
- `createValidationResultContract(overrides?)`: `ValidationResultContract` の正常系デフォルト値
- `createLayerConfig(layer, overrides?)`: `LayerConfig` のデフォルト値
- `createAggregatedReport(overrides?)`: `AggregatedValidationReport` のデフォルト値

---

## 5. QA（不明点・確認事項）

なし。it_test_design.md にモック方針・フィクスチャ要件が詳細に記述されており、設計に着手できる。

---

## 6. 前提条件・リスク

- **Wave 1 biome-ast-engine/phase-dependency-model**: 既に実装済みのため `vi.mock()` でスタブ可能
- **インポートパス**: `scripts/harness/__tests__/integration/validator-system/` からのテストヘルパーは `../../../helpers/test-helpers`（3段階）
- **Adapter内ネスト**: `adapters/` と `handlers/` サブディレクトリのため helpers へは `../../../../helpers/test-helpers`（4段階）
- **DB不要**: LocalCLIツールのためデータベース接続は不要
