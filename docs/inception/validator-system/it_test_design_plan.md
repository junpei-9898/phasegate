# ITテスト設計計画: validator-system

> **作成日**: 2026-03-19
> **対応ストーリー**: H08-01〜H08-06
> **フェーズ**: Phase 1（計画）

---

## 1. スコープ

### 対象Unit

`validator-system` — L2/L3/L4の全10バリデータ（phase-gate、metadata、test-quality、security、performance、coverage、nyquist、drift-detect、consistency-check、dead-code）の実行・集約・レポート機能を持つWave 2コアUnit。

### テスト対象コンポーネント一覧

| 分類 | コンポーネント | ストーリー |
|------|--------------|-----------|
| UseCase | RunL2ValidatorsUseCase | H08-01 |
| UseCase | RunL3ValidatorsUseCase | H08-02 |
| UseCase | RunL4ValidatorsUseCase | H08-03 |
| UseCase | RunQuickModeUseCase | H08-04 |
| UseCase | AggregateValidationResultsUseCase | H08-05 |
| UseCase | RunFullValidationUseCase | H08-06 |
| Infrastructure | HarnessConfigValidatorConfigAdapter | 全UseCase |
| Infrastructure | PhaseDependencyPhaseGatePolicyAdapter | H08-01 |
| Infrastructure | TraceabilityMetadataPolicyAdapter | H08-01 |
| Infrastructure | BiomeAstTestQualityAnalyzerAdapter | H08-01 |
| Infrastructure | FileSystemSecurityPatternScannerAdapter | H08-02 |
| Infrastructure | AstPerformanceScannerAdapter | H08-02 |
| Infrastructure | JsonCoverageReportAdapter | H08-02 |
| Infrastructure | NyquistAcCoveragePolicyAdapter | H08-02 |
| Infrastructure | MarkdownDesignDocumentAdapter | H08-03 |
| Infrastructure | BiomeAstSourceCodeAnalyzerAdapter | H08-03 |
| Infrastructure | ImportGraphSourceAnalysisAdapter | H08-03 |
| Infrastructure | AdrFoundationReferenceAdapter | H08-03 |
| Presentation | RunValidatorsHandler | H08-01〜H08-03, H08-06 |
| Presentation | RunQuickModeHandler | H08-04 |
| Presentation | ReportValidationResultsHandler | H08-05 |

---

## 2. テスト対象分析

### UseCase

| UseCase名 | 依存Repository/Port数 | テストケース概算 |
|-----------|---------------------|---------------|
| RunL2ValidatorsUseCase | 4 (ValidatorRegistry, ValidatorExecutionService, ValidatorConfigPort, ContractMapper) | 12件 |
| RunL3ValidatorsUseCase | 4 (同上 + strictOnly考慮) | 12件 |
| RunL4ValidatorsUseCase | 4 (L4専用サービス群) | 10件 |
| RunQuickModeUseCase | 4 (Profileバリデーションあるためやや多め) | 10件 |
| AggregateValidationResultsUseCase | 0 (純粋集約ロジック) | 12件 |
| RunFullValidationUseCase | 4 (3サブUseCaseオーケストレーター) | 10件 |

### Infrastructure Adapter（Repository相当）

| Adapter名 | 外部I/O | テストケース概算 |
|----------|---------|---------------|
| HarnessConfigValidatorConfigAdapter | phasegate.config.json | 8件 |
| PhaseDependencyPhaseGatePolicyAdapter | phase-dependency-model + FS | 8件 |
| TraceabilityMetadataPolicyAdapter | traceability-model + FS | 10件 |
| BiomeAstTestQualityAnalyzerAdapter | biome-ast-engine + FS | 10件 |
| FileSystemSecurityPatternScannerAdapter | FS（正規表現スキャン） | 8件 |
| AstPerformanceScannerAdapter | biome-ast-engine | 8件 |
| JsonCoverageReportAdapter | カバレッジJSON + FS | 8件 |
| NyquistAcCoveragePolicyAdapter | nyquist-validation | 6件 |
| MarkdownDesignDocumentAdapter | FS（Markdownパース） | 8件 |
| BiomeAstSourceCodeAnalyzerAdapter | biome-ast-engine + FS | 8件 |
| ImportGraphSourceAnalysisAdapter | biome-ast-engine ImportGraph | 6件 |
| AdrFoundationReferenceAdapter | adr-foundation + FS | 6件 |

### CLIハンドラー（Controller相当）

| ハンドラー名 | 役割 | テストケース概算 |
|------------|------|---------------|
| RunValidatorsHandler | ci-check / complete-check実行 | 10件 |
| RunQuickModeHandler | quick-check実行 | 8件 |
| ReportValidationResultsHandler | 結果レポート表示 | 6件 |

---

## 3. テスト方針

### モック/スタブの使用方針

- **UseCase層**: 全Portインターフェース（domain/ports/）をVitest `vi.fn()` でモックする。ValidatorRegistry・ValidatorExecutionService・ValidationResultContractMapperは実体を使用する（ドメインロジックは管理下の依存のため）
- **Infrastructure層**: 外部システム（biome-ast-engine / phase-dependency-model / nyquist-validation / adr-foundation）はモックする。ファイルシステムI/Oは `tmp`ディレクトリへの実ファイル書き込みまたはVitestのfake-fsを使用する
- **Presentation層（ハンドラー）**: UseCaseをモックする。出力はstdout capture（`vi.spyOn(process.stdout)`）で検証する

### テストDB / ファイルシステム方針

- このUnitはDBを使用しない。テスト対象の外部I/OはすべてファイルシステムまたはShared Kernel経由のモジュール呼び出し
- Adapterのファイルシステムテストには `tmp` 作業ディレクトリを使用し、`afterEach` でクリーンアップする
- テスト用フィクスチャファイルは `scripts/harness/__tests__/fixtures/validator-system/` 配下に配置する

### 認証・認可のテスト方針

- validator-systemはローカルCLIツールであり認証機構を持たない（`integration_contract.md §8` 参照）
- 権限テストは対象外

---

## 4. QA（不明点・確認事項）

QAなし。設計文書（`logical_design.md` / `domain_model.md` / `integration_contract.md`）から必要情報は十分に取得できた。

---

## 5. 前提条件・リスク

| 項目 | 内容 |
|------|------|
| Wave 1 Unit完了 | harness-error / config-foundation / traceability-model / phase-dependency-model / biome-ast-engine / adr-foundation の実装完了が前提 |
| Shared Kernel型定義確定 | HarnessError / HarnessConfigV2 / StoryId のインターフェースが確定していること |
| テストヘルパー活用 | `scripts/harness/__tests__/helpers/test-helpers.ts` の `target/context` エイリアスを使用する |
| ITテストの配置先 | `scripts/harness/__tests__/integration/validator-system/` |
