# ITテスト設計計画: ci-governance
**作成日**: 2026-03-20

## 1. スコープ
- 対象: ci-governance unit
- テスト対象: UseCase 8本、Infrastructure Adapter 4本、Presentation Handler 3本、Cross-Layer統合フロー 3本

## 2. テストファイル構成

`docs/product/construction/ci-governance/it_test_design.md` より:

### UseCase統合テスト

| UseCase | ファイル |
|---------|---------|
| GenerateCiTemplateUseCase（H13-01） | `scripts/harness/__tests__/integration/ci-governance/generate-ci-template-usecase.test.ts` |
| RenderCiTemplateUseCase（H13-01） | `scripts/harness/__tests__/integration/ci-governance/render-ci-template-usecase.test.ts` |
| RecordErrorOccurrenceUseCase（H13-02） | `scripts/harness/__tests__/integration/ci-governance/record-error-occurrence-usecase.test.ts` |
| CheckEscalationUseCase（H13-02） | `scripts/harness/__tests__/integration/ci-governance/check-escalation-usecase.test.ts` |
| ResetRepetitionUseCase（H13-02） | `scripts/harness/__tests__/integration/ci-governance/reset-repetition-usecase.test.ts` |
| MigrateAgentsMdUseCase（H13-03） | `scripts/harness/__tests__/integration/ci-governance/migrate-agents-md-usecase.test.ts` |
| AggregateLessonsUseCase（H13-03） | `scripts/harness/__tests__/integration/ci-governance/aggregate-lessons-usecase.test.ts` |
| ValidatePointersUseCase（H13-03） | `scripts/harness/__tests__/integration/ci-governance/validate-pointers-usecase.test.ts` |

### Infrastructure Adapterテスト

| Adapter | ファイル |
|---------|---------|
| ErrorRepetitionJsonRepository | `scripts/harness/__tests__/integration/ci-governance/error-repetition-json-repository.test.ts` |
| AgentsMdFileAdapter | `scripts/harness/__tests__/integration/ci-governance/agents-md-file-adapter.test.ts` |
| FileSystemExistenceAdapter | `scripts/harness/__tests__/integration/ci-governance/file-system-existence-adapter.test.ts` |
| LessonArtifactFileReaderAdapter | `scripts/harness/__tests__/integration/ci-governance/lesson-artifact-file-reader-adapter.test.ts` |

### Presentation Handlerテスト

| Handler | ファイル |
|---------|---------|
| GenerateCiTemplateHandler | `scripts/harness/__tests__/integration/ci-governance/generate-ci-template-handler.test.ts` |
| MigrateAgentsMdHandler | `scripts/harness/__tests__/integration/ci-governance/migrate-agents-md-handler.test.ts` |
| CheckRepetitionHandler | `scripts/harness/__tests__/integration/ci-governance/check-repetition-handler.test.ts` |

### Cross-Layer統合テスト

| フロー | ファイル |
|--------|---------|
| CI/CDテンプレート生成統合フロー | `scripts/harness/__tests__/integration/ci-governance/ci-template-generation-flow.test.ts` |
| 反復エラー検出統合フロー | `scripts/harness/__tests__/integration/ci-governance/error-repetition-flow.test.ts` |
| AGENTS.md移行統合フロー | `scripts/harness/__tests__/integration/ci-governance/agents-md-migration-flow.test.ts` |

## 3. QA
なし（遡及記録）
