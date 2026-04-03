# ITテスト設計計画: nyquist-validation

> **作成日**: 2026-03-19
> **対応ストーリー**: H07-01, H07-02, H07-03, H07-04
> **参照文書**:
> - `docs/product/construction/nyquist-validation/logical_design.md`
> - `docs/product/units/integration_contract.md`
> - `docs/principles/testing-rules.md`

---

## 1. スコープ

### 対象Unit
nyquist-validation Unit（Wave 2）

### テスト対象コンポーネント一覧

| 層 | コンポーネント | 種別 |
|----|---------------|------|
| Application | ValidateMatrixUseCase | UseCase |
| Application | CheckAcCoverageGateUseCase | UseCase |
| Application | CalculateCoverageUseCase | UseCase |
| Application | AnalyzeImpactUseCase | UseCase |
| Infrastructure | FileSystemMatrixFileAdapter | Adapter（Repository相当） |
| Infrastructure | TraceabilityModelStoryRegistryAdapter | Adapter（Repository相当） |
| Infrastructure | ConfigFoundationCoverageThresholdAdapter | Adapter（Repository相当） |
| Infrastructure | AjvJsonSchemaValidatorAdapter | Adapter（Repository相当） |
| Presentation | ValidateMatrixHandler | CLIハンドラー |
| Presentation | CheckAcCoverageGateHandler | CLIハンドラー |
| Presentation | CalculateCoverageHandler | CLIハンドラー |
| Presentation | AnalyzeImpactHandler | CLIハンドラー |

---

## 2. テスト対象分析

### UseCase

| UseCase名 | 依存Adapter/Port数 | テストケース概算 |
|-----------|-------------------|----------------|
| ValidateMatrixUseCase（H07-01） | MatrixFilePort, AjvJsonSchemaValidatorAdapter, MatrixValidationService（StoryRegistryPort） | 10ケース |
| CheckAcCoverageGateUseCase（H07-02） | MatrixFilePort, AjvJsonSchemaValidatorAdapter, MatrixValidationService, AcCoverageGatePolicy | 8ケース |
| CalculateCoverageUseCase（H07-03） | MatrixFilePort, AjvJsonSchemaValidatorAdapter, MatrixValidationService, CoverageCalculationService, CoverageThresholdPort | 8ケース |
| AnalyzeImpactUseCase（H07-04） | MatrixFilePort, AjvJsonSchemaValidatorAdapter, MatrixValidationService, ImpactAnalysisService | 7ケース |

### Repository / Adapter

| Adapter名 | 主操作数 | テストケース概算 |
|-----------|---------|----------------|
| FileSystemMatrixFileAdapter | read / write （2操作） | 8ケース |
| TraceabilityModelStoryRegistryAdapter | getValidStoryIds （1操作） | 4ケース |
| ConfigFoundationCoverageThresholdAdapter | getThreshold （1操作） | 5ケース |
| AjvJsonSchemaValidatorAdapter | validate （1操作） | 8ケース |

### Controller / Handler（Presentation層）

| ハンドラー | CLIコマンド | テストケース概算 |
|-----------|------------|----------------|
| ValidateMatrixHandler | 直接呼び出し（--matrix-file） | 6ケース |
| CheckAcCoverageGateHandler | phasegate:ci-check（L3-004経由） | 5ケース |
| CalculateCoverageHandler | phasegate:ci-check（--check-threshold） | 6ケース |
| AnalyzeImpactHandler | phasegate:impact-analysis | 6ケース |

---

## 3. テスト方針

### モック/スタブの使用方針

- **UseCaseテスト**: PortインターフェースをVitestのモック（`vi.fn()`）で差し替える。Domainオブジェクトはモックせずに実体を使用する（testing-rules.md §ユニットテスト規約準拠：管理下にある依存はモックしない）
- **Adapterテスト**: ファイルシステム（`node:fs/promises`）および外部モジュールをモックする。実際のI/O検証は別途統合確認する
- **Handlerテスト**: UseCaseをモックし、入出力とエラーハンドリング・終了コードを検証する

### ファイルI/Oのテスト方針

- `FileSystemMatrixFileAdapter` のテストでは `node:fs/promises` をモックして実ファイルシステムに依存しない
- シードデータとして有効な `requirement-test-matrix.json` のフィクスチャを複数パターン用意する

### テスト環境

- Vitestを使用（integration_contract.md §1 規定のVitest 3.0.0）
- テストファイル配置: `scripts/harness/__tests__/integration/nyquist-validation/`
- テストヘルパー: `scripts/harness/__tests__/helpers/test-helpers.ts`（target/context エイリアス）

### 認証・認可

- 本Unitは認証・認可機構を持たない（integration_contract.md §8）
- 認証テストは対象外

---

## 4. QA（不明点・確認事項）

特になし。論理設計が詳細に記述されており、テスト方針も §8 で定義済みのため不明点はない。

---

## 5. 前提条件・リスク

- **前提**: Wave 1の以下Unitが型定義レベルで確定済みであること
  - `harness-error`（HarnessError型）
  - `config-foundation`（HarnessConfigV2型）
  - `traceability-model`（StoryId型）
- **リスク**: `TraceabilityModelStoryRegistryAdapter` の実装が未完成の場合、`user_stories.md` パースのフォールバック実装でテストする。ITテストはフォールバック実装含めて検証する
- **スコープ外**: Presentation層のフォーマッター（HumanMatrixFormatter, AgentMatrixFormatter, JsonMatrixFormatter）のITテストは本設計に含めない（Handlerのみ対象）

---

*Phase 1 計画完了。ユーザー承認後 Phase 2（`docs/product/construction/nyquist-validation/it_test_design.md` 作成）に移行する。*
