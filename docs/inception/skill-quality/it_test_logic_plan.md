# ITテストロジック設計計画: skill-quality
**作成日**: 2026-03-20

## 1. スコープ
- 対象: skill-quality
- 参照: it_test_design.md, logical_design.md

## 2. 構成

テストファイル構成（`scripts/harness/__tests__/integration/skill-quality/`）:
- `execute-tdd-cycle-usecase.test.ts` — ExecuteTddCycleUseCase
- `check-coverage-usecase.test.ts` — CheckCoverageUseCase
- `run-plan-checker-loop-usecase.test.ts` — RunPlanCheckerLoopUseCase
- `collect-lessons-usecase.test.ts` — CollectLessonsUseCase
- `write-lesson-artifact-usecase.test.ts` — WriteLessonArtifactUseCase
- `apply-cascade-update-usecase.test.ts` — ApplyCascadeUpdateUseCase
- `validate-skill-structure-usecase.test.ts` — ValidateSkillStructureUseCase
- `git-commit-executor-adapter.test.ts` — GitCommitExecutorAdapter
- `file-system-lesson-source-reader-adapter.test.ts`
- `file-system-lesson-artifact-writer-adapter.test.ts`
- `ajv-lesson-artifact-schema-adapter.test.ts`
- `file-system-requirement-test-matrix-adapter.test.ts`
- `harness-config-query-adapter.test.ts` — HarnessConfigQueryAdapter
- `file-system-skill-file-reader-adapter.test.ts`
- `execute-tdd-cycle-handler.test.ts` — ExecuteTddCycleHandler
- `check-coverage-handler.test.ts` — CheckCoverageHandler
- `run-plan-checker-loop-handler.test.ts` — RunPlanCheckerLoopHandler
- `collect-lessons-handler.test.ts` — CollectLessonsHandler
- `apply-cascade-update-handler.test.ts` — ApplyCascadeUpdateHandler
- `validate-skill-structure-handler.test.ts` — ValidateSkillStructureHandler

## 3. QA
なし（遡及記録）
