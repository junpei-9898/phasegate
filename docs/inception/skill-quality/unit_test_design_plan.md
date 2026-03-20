# ユニットテスト設計計画: skill-quality
**作成日**: 2026-03-20

## 1. スコープ
- 対象: skill-quality
- 対応ストーリー: H12-01, H12-02, H12-03, H12-04, H12-05, H12-06
- テストケース総数: ユニットテスト設計書（unit_test_design.md）に記載の全テストケース

## 2. 構成

対象ドメインモデル:
- **集約ルート**: PlanCheckerLoop, LessonArtifact
- **値オブジェクト**: CommitMessage, TddCycle, CommitReadiness, CoverageReport, RequirementCoverageResult, CodeCoverageResult, LoopAttempt, Lesson, LessonFingerprint, SourceContext, CascadeUpdateTarget, CascadeUpdateResult, SkillStructure, SkillValidationResult
- **ドメインサービス**: AtomicCommitService, LessonCollector, LessonDeduplicator, CascadeUpdateService, SkillStructureValidator

テスト配置: `scripts/harness/__tests__/unit/skill-quality/`

主な設計方針:
- 集約ルートの不変条件（INV-1〜INV-10）を網羅的に検証
- ドメインサービスはモック禁止（testing-rules.md準拠）
- AAA パターン、日本語テスト名、`actual` 変数使用

## 3. QA
なし（遡及記録）
