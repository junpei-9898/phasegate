# ユニットテスト設計計画: regression-suite
**作成日**: 2026-03-20

## 1. スコープ
- 対象: regression-suite
- 対応ストーリー: H14-01, H14-02, H14-03, H15-01, H15-02
- テストケース総数: 127件（unit_test_design.md より）

## 2. 構成

対象ドメインモデル:
- **集約ルート（エンティティ）**: V0TestMigration
- **値オブジェクト**: SuiteId, RegressionSuiteDefinition, KRequirementTest, GngConditionTest, AgentIndependenceTest, MigrationMapping, CiGateConfig, TestExecutionSummary, BiomeModificationSpec
- **補助型 VO**: V0TestId, V1TestPath, CoverageRate, ImportViolation, TestFailureDetail
- **ドメインサービス**: RegressionRunner, MigrationAnalyzer, ImportGuardService

テスト配置: `scripts/harness/__tests__/unit/regression-suite/`

主な設計方針:
- V0TestMigration集約の状態遷移（pending/migrated/modified/skipped）を網羅的に検証
- 不変条件（INV-1〜INV-10）全てをカバー
- ドメインサービスはモック禁止（testing-rules.md準拠）

## 3. QA
なし（遡及記録）
