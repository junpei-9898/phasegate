# TDD実装計画: H13-03 (ci-governance)

## 1. スコープ
- 対象ストーリー: H13-03 AGENTS.mdポインタ型移行
- 影響する層: domain（AgentsMdPointer集約、PointerEntry/LessonArtifact VO、PointerValidator/LessonAggregator ドメインサービス）、application（MigrateAgentsMdUseCase、AggregateLessonsUseCase、ValidatePointersUseCase）、infrastructure（AgentsMdFileAdapter、LessonArtifactFileReaderAdapter、FileSystemExistenceAdapter、HarnessApiCommandExistenceAdapter、AdrFoundationExistenceAdapter）、presentation（MigrateAgentsMdHandler: `ci:migrate-agents-md`）

## 2. 前提条件検証
- ✅ 実装準備完了（遡及記録）

## 3. 実装状況（遡及記録）

### 実装済みファイル

| ファイル | 説明 |
|---------|------|
| `scripts/harness/ci-governance/domain/aggregates/agents-md-pointer.ts` | AgentsMdPointer集約（addPointer/replacePointer/validate、INV-8/INV-9） |
| `scripts/harness/ci-governance/domain/value-objects/pointer-entry.ts` | PointerEntry VO（CommandPointer/FilePointer Union型、INV-11: 相対パス必須） |
| `scripts/harness/ci-governance/domain/value-objects/lesson-artifact.ts` | LessonArtifact VO（lessonId UUID必須 INV-12、LessonArtifactSchema定義） |
| `scripts/harness/ci-governance/domain/services/pointer-validator.ts` | PointerValidator（CommandExistencePort/FileExistencePort/AdrExistencePort注入） |
| `scripts/harness/ci-governance/domain/services/lesson-aggregator.ts` | LessonAggregator（ポート依存なし、lessonId重複検出、key='lesson-{lessonId}'形式） |
| `scripts/harness/ci-governance/application/` | MigrateAgentsMdUseCase（dryRun/KPIチェック）、AggregateLessonsUseCase、ValidatePointersUseCase |
| `scripts/harness/ci-governance/infrastructure/agents-md-file-adapter.ts` | AgentsMdFileAdapter（read/write、before/after行数返却） |
| `scripts/harness/ci-governance/infrastructure/lesson-artifact-file-reader-adapter.ts` | LessonArtifactFileReaderAdapter（lessons/*.lesson.json読み取り） |
| `scripts/harness/ci-governance/infrastructure/file-system-existence-adapter.ts` | FileSystemExistenceAdapter |
| `scripts/harness/ci-governance/presentation/handlers/migrate-agents-md-handler.ts` | `ci:migrate-agents-md` CLIハンドラー（--dry-run/--validate-only フラグ） |
| `docs/contracts/lesson-artifact.schema.json` | LessonArtifact JSONスキーマ（Cross-Unit Contract、skill-quality参照用） |

### テスト状況
- ユニットテスト: ✅ 完了（`agents-md-pointer.test.ts`, `pointer-entry.test.ts`, `pointer-validator.test.ts`, `lesson-aggregator.test.ts`）
- 統合テスト: ✅ 完了（`migrate-agents-md-usecase.test.ts`, `aggregate-lessons-usecase.test.ts`, `validate-pointers-usecase.test.ts`, `migrate-agents-md-handler.test.ts`, `agents-md-file-adapter.test.ts`, `lesson-artifact-file-reader-adapter.test.ts`, `file-system-existence-adapter.test.ts`, `agents-md-migration-flow.test.ts`）
- E2Eテスト: ✅ 完了（`cli-harness.test.ts` `ci:migrate-agents-md` コマンド認識確認）

## 4. QA
なし（遡及記録）
