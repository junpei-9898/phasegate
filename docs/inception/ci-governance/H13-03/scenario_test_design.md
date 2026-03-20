# シナリオテスト設計: H13-03 — AGENTS.mdポインタ型移行
> **Unit ID**: ci-governance
> **作成日**: 2026-03-20

## 1. テスト対象機能

H13-03はAGENTS.mdのポインタ型移行機能を実装する。具体的には以下を提供する:

- AGENTS.mdの記述的バリデータ一覧を `harness:status` 実行へのポインタに置換
- AGENTS.mdへのADR参照リンクの追加
- ポインタ型移行後の行数50%以上削減（KPI）
- ポインタが参照する先（コマンド、ファイル）の実在性検証（Dead Pointer禁止: INV-9）
- skill-qualityから出力されたlesson artifactのAGENTS.mdへの集約・反映
- `LessonArtifact` のlessonIdによる重複検出（INV-12: UUID形式必須）

CLIコマンド: `ci:migrate-agents-md [--dry-run] [--validate-only]`
Presentation: `scripts/harness/ci-governance/presentation/handlers/migrate-agents-md-handler.ts`

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-H13-03-001 | lesson artifactを読み取りAGENTS.mdへの移行が成功すること | `dryRun=false`, 2件のLessonArtifact, 全PointerEntry実在 | `success=true`, `addedPointers=2`, `kpiMet=true`（行数50%以上削減） |
| SC-H13-03-002 | dryRun=trueの場合はAgentsMdPort.write()が呼ばれないこと | `dryRun=true` | `success=true`, AgentsMdPort.write()が呼び出されない |
| SC-H13-03-003 | 移行後行数が移行前の50%以下でkpiMet=trueになること | AgentsMdPort.write()→`{before:100, after:49}` | `kpiMet=true` |
| SC-H13-03-004 | 移行後行数が移行前の50%超でkpiMet=falseになること | AgentsMdPort.write()→`{before:100, after:51}` | `kpiMet=false` |
| SC-H13-03-005 | 同一バッチ内に重複lessonIdがある場合は移行が中断されること | LessonArtifact[]に同一lessonId 2件 | `success=false`, errors にDUPLICATE_LESSON_ID, write()が呼ばれない |
| SC-H13-03-006 | Dead Pointerが検出された場合は移行が中断されること | FileExistencePort: `exists('nonexistent.md')→false` | `success=false`, errors にAGENTS_MD_DEAD_POINTER |
| SC-H13-03-007 | --validate-onlyフラグ付きでPointerValidationのみが実行されること | `args=['--validate-only']` | ValidatePointersUseCase.execute()が呼ばれる、MigrateAgentsMdUseCase.execute()は呼ばれない |
| SC-H13-03-008 | PointerEntry.keyの一意性違反（INV-8）が検出されること | 同一keyのPointerEntry 2件 | `CiGovernanceDomainError`（INV-8違反） |
| SC-H13-03-009 | LessonArtifactのlessonIdがUUID形式でない場合にバリデーションエラーが返ること（INV-12） | `lessonId='invalid-id'`（非UUID） | バリデーションエラー |
| SC-H13-03-010 | E2E: `ci:migrate-agents-md` コマンドが認識されること | `args=['--dry-run']` | stderrに "Unknown command: ci:migrate-agents-md" を含まない |

## 3. テスト配置

- ユニットテスト: `scripts/harness/__tests__/unit/ci-governance/agents-md-pointer.test.ts`
- ユニットテスト: `scripts/harness/__tests__/unit/ci-governance/pointer-entry.test.ts`
- ユニットテスト: `scripts/harness/__tests__/unit/ci-governance/pointer-validator.test.ts`
- ユニットテスト: `scripts/harness/__tests__/unit/ci-governance/lesson-aggregator.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/ci-governance/migrate-agents-md-usecase.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/ci-governance/aggregate-lessons-usecase.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/ci-governance/validate-pointers-usecase.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/ci-governance/migrate-agents-md-handler.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/ci-governance/agents-md-file-adapter.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/ci-governance/lesson-artifact-file-reader-adapter.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/ci-governance/agents-md-migration-flow.test.ts`
- E2Eテスト: `scripts/harness/__tests__/e2e/cli-harness.test.ts`（`ci-governance コマンド群` セクション）

## 4. 前提条件

- `AgentsMdPointer` 集約ルート: Dead Pointer禁止（INV-9）。`addPointer()`はINV-8（key一意性）を強制
- `LessonAggregator` ドメインサービス: LessonArtifact[] → PointerEntry[]変換、ポート依存なし（VO変換のみ）
- `PointerValidator` ドメインサービス: CommandExistencePort / FileExistencePort / AdrExistencePort で実在性検証
- `AgentsMdFileAdapter`: write()が移行前後の行数`{before: N, after: M}`を返す（KPI計測）
- `LessonArtifactSchema`: `docs/contracts/lesson-artifact.schema.json` がCross-Unit ContractとしてJSONスキーマ公開
