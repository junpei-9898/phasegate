# ITテスト設計計画: regression-suite
**作成日**: 2026-03-20

## 1. スコープ
- 対象: regression-suite
- 対応ストーリー: H14-01, H14-02, H14-03, H15-01, H15-02
- テストケース総数: 68件（it_test_design.md より）

## 2. 構成

対象コンポーネント:
- **UseCase**: RunKRequirementsRegressionUseCase, RunK14K15RegressionUseCase, RunAgentIndependenceGuardUseCase, RunGngGateRegressionUseCase, AnalyzeV0MigrationUseCase, MigrateV0TestsUseCase, ConfigureCiGateUseCase
- **Infrastructure Adapter**: VitestTestRunnerAdapter, FileSystemV0SpecReaderAdapter, BiomeAstImportAnalyzerAdapter, MarkdownMigrationMappingRepositoryAdapter, HarnessConfigQueryAdapter, JsonCiGateResultWriterAdapter, StaticSuiteRegistryAdapter
- **Cross-Layer Integration**: k-requirements/gng-gate/agent-independence/v0-migration各実行フロー + CIゲート設定フロー

テスト配置: `scripts/harness/__tests__/integration/regression-suite/`

主な設計方針:
- fixtures（v0-spec-files, v0_v1_test_mapping.md, phasegate.config.json, ci-gate-output）を使用
- DIコンテナでAdapterをインジェクション、beforeEach/afterEachでフィクスチャ管理
- vi.mock()でポートのモックを差し替え

## 3. QA
なし（遡及記録）
