# ユニットテストロジック設計計画: skill-quality
**作成日**: 2026-03-20

## 1. スコープ
- 対象: skill-quality
- 参照: unit_test_design.md, domain_model.md

## 2. 構成

テストファイル構成（`scripts/harness/__tests__/unit/skill-quality/`）:
- `plan-checker-loop.test.ts` — PlanCheckerLoop 集約ルート
- `lesson-artifact.test.ts` — LessonArtifact 集約ルート
- `commit-message.test.ts` — CommitMessage VO
- `tdd-cycle.test.ts` — TddCycle VO
- `commit-readiness.test.ts` — CommitReadiness VO
- `coverage-report.test.ts` — CoverageReport VO
- `requirement-coverage-result.test.ts` — RequirementCoverageResult VO
- `code-coverage-result.test.ts` — CodeCoverageResult VO
- `loop-attempt.test.ts` — LoopAttempt VO
- `lesson.test.ts` — Lesson VO
- `lesson-fingerprint.test.ts` — LessonFingerprint VO
- `source-context.test.ts` — SourceContext VO
- `cascade-update-target.test.ts` — CascadeUpdateTarget VO
- `cascade-update-result.test.ts` — CascadeUpdateResult VO
- `skill-structure.test.ts` — SkillStructure VO
- `skill-validation-result.test.ts` — SkillValidationResult VO
- `atomic-commit-service.test.ts` — AtomicCommitService ドメインサービス
- `lesson-collector.test.ts` — LessonCollector ドメインサービス
- `lesson-deduplicator.test.ts` — LessonDeduplicator ドメインサービス
- `cascade-update-service.test.ts` — CascadeUpdateService ドメインサービス
- `skill-structure-validator.test.ts` — SkillStructureValidator ドメインサービス

## 3. QA
なし（遡及記録）
