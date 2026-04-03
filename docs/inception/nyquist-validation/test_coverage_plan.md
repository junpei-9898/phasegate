# テストカバレッジ計画: nyquist-validation

> **Unit ID**: nyquist-validation
> **作成日**: 2026-03-19
> **フェーズ**: Phase 1（計画）
> **目的**: テストカバレッジ分析・Engineering Perspective評価の実施計画

---

## 1. 計画概要

### 目的

nyquist-validationユニットのテスト設計文書（unit_test_design.md / it_test_design.md）を対象に、以下を検証する。

1. 受け入れ基準（H07-01〜H07-04の各AC）とテストケースのカバレッジマッピング
2. ドメインモデルの不変条件・ビジネスルールのカバー状況
3. UseCase・Infrastructure・Presentation各層の正常系/異常系カバー状況
4. Engineering Perspective（Kent Beck / Martin Fowler / Uncle Bob / Eric Evans）による設計評価

### インプット一覧

| ドキュメント | 用途 |
|-----------|------|
| `docs/product/units/nyquist_validation_unit.md` | 受け入れ基準（H07-01〜H07-04の機能要件） |
| `docs/product/construction/nyquist-validation/domain_model.md` | ドメインモデル・不変条件（INV-1〜INV-4） |
| `docs/product/construction/nyquist-validation/logical_design.md` | アーキテクチャ層構成・UseCase・Adapter・Handler |
| `docs/product/construction/nyquist-validation/unit_test_design.md` | ユニットテストケース設計（127ケース） |
| `docs/product/construction/nyquist-validation/it_test_design.md` | ITテストケース設計（UseCase/Adapter/Handler） |
| `docs/product/units/integration_contract.md` | Cross-Unit契約・Shared Kernel定義 |

### アウトプット

- `docs/product/construction/nyquist-validation/coverage_report.md`

---

## 2. 分析スコープ

### 2.1 受け入れ基準カバレッジ分析

H07-01〜H07-04の各ACに対して、対応するテストケースのマッピングを網羅的に確認する。

| ストーリー | AC数（概算） | 分析対象テスト |
|----------|------------|--------------|
| H07-01 requirement-test-matrix.json新設 | 5 | UT-RTM-*, UT-MVS-*, IT-UC-ValidateMatrix-*, IT-REPO-* |
| H07-02 phase-gate ACマッピング完了チェック | 4 | UT-ACGP-*, IT-UC-CheckACGate-* |
| H07-03 test-coverage-checkerでの要件カバレッジ算出 | 3 | UT-CCS-*, UT-CVR-*, IT-UC-CalcCoverage-*, IT-REPO-Threshold-* |
| H07-04 phasegate:impact-analysis HXX-XXコマンド | 4 | UT-IAS-*, UT-IAR-*, IT-UC-AnalyzeImpact-*, IT-API-AnalyzeImpactHandler-* |

### 2.2 ドメインロジックカバレッジ分析

domain_model.mdに定義された不変条件・ドメインサービスルールのカバー状況を検証する。

- **INV-1**: 同一storyIdのStoryMappingは1つのみ → UT-RTM-006〜007
- **INV-2**: AcMapping.acIdは `AC-{n}` 形式 → UT-RTM-008〜012, UT-ACM-004〜009
- **INV-3**: TestReference.testTypeは `unit | it | scenario` → UT-RTM-013〜017, UT-TR-006〜009
- **INV-4**: TestReference.filePathは空文字でない → UT-RTM-018〜020, UT-TR-004〜005
- **AcCoverageGatePolicy**: passed/false条件 → UT-ACGP-001〜010
- **CoverageCalculationService**: rate算出ロジック → UT-CCS-001〜009
- **ImpactAnalysisService**: 直接マッピング逆引き → UT-IAS-001〜007
- **MatrixValidationService**: storyId整合性 → UT-MVS-001〜008

### 2.3 UseCaseカバレッジ分析

Application層の4UseCaseについて、正常系・異常系・エッジケースを確認する。

- ValidateMatrixUseCase（10ケース）
- CheckAcCoverageGateUseCase（8ケース）
- CalculateCoverageUseCase（8ケース）
- AnalyzeImpactUseCase（7ケース）

### 2.4 APIカバレッジ分析

Presentation層の4ハンドラーとInfrastructure層の4アダプターについて確認する。

- ハンドラー: ValidateMatrixHandler, CheckAcCoverageGateHandler, CalculateCoverageHandler, AnalyzeImpactHandler
- アダプター: FileSystemMatrixFileAdapter, TraceabilityModelStoryRegistryAdapter, ConfigFoundationCoverageThresholdAdapter, AjvJsonSchemaValidatorAdapter

---

## 3. Engineering Perspective評価計画

### 3.1 ケント・ベック視点（TDD適切性）

評価対象: unit_test_design.md のテストケース粒度・YAGNI観点

確認ポイント:
- 各テストケースが単一のRed-Green-Refactorステップとして独立して実施可能か
- 現時点でYAGNIに反する将来シナリオのテストが含まれていないか（特にv1スコープ境界）
- 小さなステップで実装可能な粒度か（集約・VO・ドメインサービス単位の分割）

### 3.2 マーティン・ファウラー視点（テスト設計スメル）

評価対象: unit_test_design.md / it_test_design.md の設計品質

確認ポイント:
- テストメソッドが長くなりすぎる設計になっていないか（テーブル駆動テストの妥当性）
- テストケース間の暗黙的な依存関係（実行順序依存）がないか
- セットアップコードが過剰で本質的アサーションが埋もれていないか（特にAdapter・Handler層）

### 3.3 アンクル・ボブ視点（SOLID・責務分離）

評価対象: unit/ITテスト間の責務境界

確認ポイント:
- ユニットテストがDomain層のみをテストし、ITテストがApplication/Infrastructure/Presentation層を担当しているか（SRP）
- テスト対象クラスのインターフェース設計がDIP（依存性逆転原則）に沿っているか（Port経由のモック）
- 各テストケースが単一の振る舞いをテストしているか（複数のアサーションで複数の振る舞いを同時テストしていないか）

### 3.4 エリック・エヴァンス視点（ドメイン表現）

評価対象: テストケース名・シナリオのユビキタス言語使用状況

確認ポイント:
- テストケース名にドメイン用語（RequirementTestMatrix, AcMapping, CoverageResult等）が適切に使用されているか
- 集約境界（RequirementTestMatrix内部）をまたぐテストがユニットテストに混入していないか
- ドメイン不変条件テスト（INV-1〜4）とアプリケーション層テストが適切に分離されているか

---

## 4. 実施スケジュール（Phase 2）

| フェーズ | 作業内容 | 成果物 |
|---------|---------|-------|
| Phase 2-1 | 受け入れ基準カバレッジマッピング | coverage_report.md §2 |
| Phase 2-2 | ドメインロジックカバレッジ分析 | coverage_report.md §3 |
| Phase 2-3 | UseCaseカバレッジ分析 | coverage_report.md §4 |
| Phase 2-4 | APIカバレッジ分析 | coverage_report.md §5 |
| Phase 2-5 | Engineering Perspective評価（4視点） | coverage_report.md §6 |
| Phase 2-6 | 未カバー項目・推奨追加ケース整理 | coverage_report.md §7-9 |

---

## 5. BLOCK基準

以下のいずれかに該当する場合、coverage_report.mdをBLOCKとする。

- 全受け入れ基準のマッピングが完了していない
- 受け入れ基準/ドメインロジック/UseCase/API の4観点のいずれかが欠落している
- 未カバー項目の優先度付けが欠如している
- Engineering Perspective 4視点のいずれかが未評価
- NG判定がある場合に改善案が記載されていない
