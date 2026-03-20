---
# 論理設計計画: nyquist-validation
**Phase**: 2（Unit横断設計）
**作成日**: 2026-03-20
**対応Unit**: nyquist-validation

## 1. スコープ
- 対象Unit: nyquist-validation
- 影響するストーリー: H07-01, H07-02, H07-03, H07-04

## 2. 設計方針

要件（AC）とテストケースの双方向トレーサビリティをJSON駆動で機械的に保証する設計を採用した。主要な設計判断は以下の通り。

- **RequirementTestMatrix集約ルートパターン**: requirement-test-matrix.jsonの読み込み・検証・照会を単一の集約ルートに集約し、一貫性を担保する。
- **AcCoverageGatePolicyの責務分離**: ACマッピング完了判定ロジックは本Unitが定義し、実行はvalidator-systemのphase-gateバリデータ（L2-001）に委譲する。ポリシーの定義と実行の分離による単一責任原則の遵守。
- **JSONスキーマバリデーション分離**: スキーマファイルは `docs/contracts/requirement-test-matrix.schema.json` に配置し、ajvでの機械的バリデーションをInfrastructure層アダプタが担う。Domain層はスキーマ依存を持たない。
- **@storyメタデータ整合性**: requirement-test-matrix.json内のstoryIdはtraceability-modelのStoryId一覧と照合し、未登録storyIdを検出する。
- **CLIコマンド所有の明確化**: `harness:impact-analysis` のCLIエントリポイントはharness-apiが所有し、本Unitは実行ロジック（ImpactAnalysisService等）のみを提供する。
- **カバレッジ閾値の参照先明確化**: コードカバレッジ閾値はconfig-foundationのPreset定義から取得。ハードコーディング禁止。

## 3. 採用パターン
- アーキテクチャ: Hexagonal Architecture（Port & Adapter）
- 層構成: domain → application → infrastructure → presentation
- 依存方向: `domain <- application <- infrastructure` / `domain <- application <- presentation`
- 集約1種（RequirementTestMatrix）
- エンティティ1種（StoryMapping）
- 値オブジェクト4種（AcMapping, TestReference, CoverageResult, ImpactAnalysisResult）
- ドメインサービス4種（AcCoverageGatePolicy, MatrixValidationService, CoverageCalculationService, ImpactAnalysisService）
- ドメインエラー7種（NyquistDomainError系）
- ドメインポート3種（MatrixFilePort, StoryRegistryPort, CoverageThresholdPort）
- UseCase4種（H07-01〜H07-04対応）
- インフラアダプタ4種（AjvJsonSchemaValidatorAdapter, ConfigFoundationCoverageThresholdAdapter, FileSystemMatrixFileAdapter, TraceabilityModelStoryRegistryAdapter）

## 4. QA
なし（実装完了後の遡及記録のため）
