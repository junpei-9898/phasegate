# ITテスト設計計画: harness-api

> **作成日**: 2026-03-19
> **Unit**: harness-api
> **Wave**: 2（コア品質機構）
> **対応ストーリー**: H09-01, H09-02, H09-03, H09-04

---

## 1. スコープ

- **対象Unit**: harness-api（Wave 2 コア品質機構）
- **論理設計参照**: `docs/product/construction/harness-api/logical_design.md`
- **統合契約参照**: `docs/product/units/integration_contract.md`

### テスト対象コンポーネント一覧

| 層 | コンポーネント | テスト対象 |
|----|--------------|---------|
| Application | InitializeCommandRegistryUseCase | H09-01 |
| Application | DispatchCommandUseCase | H09-02 |
| Application | DecideExitCodeUseCase | H09-03 |
| Application | DeriveHarnessStatusUseCase | H09-04 |
| Infrastructure | ValidatorSystemExecutionAdapter | ValidatorExecutionPort実装 |
| Infrastructure | PhaseDependencyModelQueryAdapter | PhaseGateQueryPort実装 |
| Infrastructure | BiomeAstEngineLintAdapter | BiomeLintPort実装 |
| Infrastructure | NyquistValidationImpactAnalysisAdapter | ImpactAnalysisPort実装 |
| Infrastructure | FileSystemArtifactScannerAdapter | ArtifactScannerPort実装 |
| Infrastructure | HarnessConfigQueryAdapter | ConfigQueryPort実装 |
| Presentation | CheckReadyHandler | phasegate:check-ready |
| Presentation | CheckPhaseHandler | phasegate:check-phase |
| Presentation | CiCheckHandler | phasegate:ci-check |
| Presentation | DetectDriftHandler | phasegate:detect-drift |
| Presentation | StatusHandler | phasegate:status |
| Presentation | LintHandler | phasegate:lint |
| Presentation | CompleteCheckHandler | phasegate:complete-check |
| Presentation | ImpactAnalysisHandler | phasegate:impact-analysis |
| Cross-Layer | CommandDispatch統合フロー | UseCase→Service→Port連携 |
| Cross-Layer | StatusDerivation統合フロー | UseCase→Service→Port連携 |
| Cross-Layer | Shared Kernel Contract | HarnessApiResponse<T>構造の契約検証 |

---

## 2. テスト対象分析

### UseCase

| UseCase名 | 依存Port/Service数 | テストケース概算 |
|-----------|------------------|---------------|
| InitializeCommandRegistryUseCase | CommandRegistry（1） | 5ケース（正常2・異常3） |
| DispatchCommandUseCase | CommandDispatchService（1）+ Mapper（1） | 8ケース（各コマンド正常1・異常2） |
| DecideExitCodeUseCase | なし（純粋関数） | 6ケース（status×コマンド種別） |
| DeriveHarnessStatusUseCase | ArtifactScannerPort（1）+ ConfigQueryPort（1）+ StatusDerivationService（1） | 6ケース（正常2・異常4） |

### Infrastructure Adapter（Repositoryに相当）

| Adapter名 | 外部依存数 | テストケース概算 |
|----------|----------|---------------|
| ValidatorSystemExecutionAdapter | validator-system（1）+ phasegate.config.json（1） | 6ケース |
| PhaseDependencyModelQueryAdapter | phase-dependency-model（1）+ fs（1） | 5ケース |
| BiomeAstEngineLintAdapter | biome-ast-engine（1）| 4ケース |
| NyquistValidationImpactAnalysisAdapter | nyquist-validation（1）+ requirement-test-matrix.json（1） | 5ケース |
| FileSystemArtifactScannerAdapter | fs/promises（1）+ fast-glob（1）+ phasegate.config.json（1） | 5ケース |
| HarnessConfigQueryAdapter | config-foundation（1）+ phasegate.config.json（1） | 4ケース |

### Controller/API（CLIハンドラー）

| ハンドラー（エンドポイント） | コマンド | テストケース概算 |
|--------------------------|---------|---------------|
| CheckReadyHandler | phasegate:check-ready | 4ケース |
| CheckPhaseHandler | phasegate:check-phase | 5ケース |
| CiCheckHandler | phasegate:ci-check | 4ケース |
| DetectDriftHandler | phasegate:detect-drift | 4ケース |
| StatusHandler | phasegate:status | 4ケース |
| LintHandler | phasegate:lint | 4ケース |
| CompleteCheckHandler | phasegate:complete-check | 4ケース |
| ImpactAnalysisHandler | phasegate:impact-analysis | 5ケース |
| Cross-Layer統合 | コマンドディスパッチ統合フロー | 5ケース |
| Cross-Layer統合 | StatusDerivation統合フロー | 4ケース |
| Cross-Layer統合 | Shared Kernel Contract検証 | 3ケース |

---

## 3. テスト方針

### モック/スタブの使用方針

- **UseCaseテスト**: ポート（ValidatorExecutionPort等）はすべてVitestのモック（`vi.fn()`）でスタブ化する。CommandRegistry・StatusDerivationService等のドメインサービスは実体を使用する（管理下の依存のため）
- **Adapterテスト**: 外部Unit（validator-system, phase-dependency-model, biome-ast-engine, nyquist-validation, config-foundation）はスタブ化する。`node:fs/promises`・`fast-glob` はテスト用一時ディレクトリを使用してスタブなしでテスト可能な場合は実体を優先
- **CLIハンドラーテスト**: DispatchCommandUseCaseをモック化し、JSON stdout出力・exitCode設定を検証する

### DBテストの方針

- harness-apiはデータベースを持たない。外部依存はファイルシステム（`docs/`, `scripts/harness/`, `phasegate.config.json`）
- ファイルシステムへのアクセスが必要なAdapterテストは、テスト用一時ディレクトリ（`tmp/test-{uuid}/`）を利用する
- Adapterの外部Unit依存（validator-system等）は Wave 2未完時はスタブ実装を使用する

### 認証・認可のテスト方針

- `integration_contract.md §8` に記載の通り、harness-apiは認証認可機構を持たない
- テスト対象外

### ExitCode検証方針

- `process.exitCode` の設定を直接検証する
- `phasegate:status` コマンドの特殊ルール（fail→0変換）は DecideExitCodeUseCase テストで重点検証

### Cross-Unit Contract検証方針

- `HarnessApiResponse<T>` のJSON構造が `integration_contract.md §2.2` のDTOスキーマに準拠することをShared Kernel Contractテストで検証する

---

## 4. QA（不明点・確認事項）

### [Question] Q1: Wave 2未完AdapterのITテスト方針

ValidatorSystemExecutionAdapter・NyquistValidationImpactAnalysisAdapterは wave 2完了後に正式インターフェースが確定する。ITテスト段階でスタブ実装を前提として設計してよいか？

**推奨案:** スタブ実装を前提としたITテストケースを設計し、`// @stub: wave2-pending` というコメントで識別子を付与する。正式インターフェース確定後にスタブを差し替えてテストが通過することを確認する形式とする。

[Answer]
（人間が回答を記入）

### [Question] Q2: FileSystemArtifactScannerAdapterのテスト環境

ファイルシステムスキャンテストにおいて、実際の `docs/` ・ `scripts/harness/` ディレクトリを参照するか、テスト専用のフィクスチャーディレクトリを用意するか？

**推奨案:** テスト用フィクスチャーディレクトリ（`scripts/harness/__tests__/fixtures/harness-api/artifact-scan/`）を用意し、テスト再現性を確保する。

[Answer]
（人間が回答を記入）

---

## 5. 前提条件・リスク

| 項目 | 詳細 |
|------|------|
| 前提1 | Wave 1の6Unit（harness-error, config-foundation, traceability-model, phase-dependency-model, adr-foundation, biome-ast-engine）が実装完了済み |
| 前提2 | 論理設計（`logical_design.md`）が確定済み（2026-03-19時点） |
| 前提3 | テスト規約（AAAパターン・日本語テスト名・target/context/describe/it構造・actual変数）に従う |
| リスク1 | ValidatorSystemExecutionAdapter・NyquistValidationImpactAnalysisAdapterはWave 2未完のためスタブ実装を使用 |
| リスク2 | phasegate:complete-checkはbiome-ast-engineとvalidator-systemの両方を統合実行するため、スタブ依存が多くなる可能性がある |
