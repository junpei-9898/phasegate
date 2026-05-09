# シナリオテスト設計: H11-04 — Claude Code Stop Hook Adapter（テストゲート + ci-check + 無限ループ防止）
> **Unit ID**: agent-integration
> **作成日**: 2026-03-20

## 1. テスト対象機能

H11-04はClaude Code Stop Hook Adapterを実装する。具体的には以下を提供する:

- Stop Hook 発火時に `phasegate:complete-check` コマンドを呼び出す（pnpm test + L1-L4全バリデータ統合実行）
- `stop_hook_active` フラグ（ReentryGuard）による無限ループ防止
  - 再入検出時（`isActive()=true`）: `REENTRY_DETECTED` でスキップし警告出力
  - 正常実行時: `activate()` → `phasegate:complete-check` 実行 → `deactivate()`
- `phasegate:complete-check` が失敗（exitCode≠0）した場合、エージェント完了を阻止（exitCode=非ゼロで終了）
- CLI経路でも `phasegate:complete-check` により同等の完了チェックが実行可能

実装: `scripts/harness/agent-integration/presentation/stop-hook.ts`
UseCase: `scripts/harness/agent-integration/application/usecases/handle-stop-usecase.ts`
テスト: `scripts/harness/__tests__/integration/agent-integration/handle-stop-usecase.test.ts`

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-H11-04-001 | Stop Hook が正常に `phasegate:complete-check` を呼び出すこと | `sessionId='session-123'`, ReentryGuard非アクティブ, CLIExecutor: exitCode=0 | `executed=true`, `skipReason=undefined`, `cliResult.exitCode=0` |
| SC-H11-04-002 | 再入検出時にREENTRY_DETECTEDでスキップされること | `stop_hook_active=true`（ReentryGuardアクティブ） | `executed=false`, `skipReason='REENTRY_DETECTED'` |
| SC-H11-04-003 | complete-check失敗時にexitCodeが非ゼロで返ること | CLIExecutor: exitCode=1 | `cliResult.exitCode=1`（エージェント完了阻止） |
| SC-H11-04-004 | 正常完了後にReentryGuardがdeactivateされること | CLIExecutor: exitCode=0 | `ReentryGuardStatePort.clear()` が呼び出される |
| SC-H11-04-005 | HookTranslationResultのcliCommandが`phasegate:complete-check`であること | StopEvent変換 | `cliCommand='phasegate:complete-check'`, `cliArgs=[]` |
| SC-H11-04-006 | activate後に再入すると二重activateでHarnessErrorが発生すること（INV-1） | `activate()` 2回連続呼び出し | `HarnessError`が発生（INV-1: isActive()=trueでのactivate禁止） |

## 3. テスト配置

- ユニットテスト: `scripts/harness/__tests__/unit/agent-integration/reentry-guard.test.ts`
- ユニットテスト: `scripts/harness/__tests__/unit/agent-integration/hook-to-cli-translator.test.ts`（Stop変換ルール）
- 統合テスト: `scripts/harness/__tests__/integration/agent-integration/handle-stop-usecase.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/agent-integration/env-file-reentry-guard-state-adapter.test.ts`

## 4. 前提条件

- `ReentryGuard` エンティティ: `activate()` / `isActive()` / `deactivate()` ライフサイクル
- `EnvFileReentryGuardStateAdapter`: `strategy: 'env'` で環境変数ベースの状態永続化
- `HookToCliTranslator.translate(StopEvent)`: ReentryGuard.isActive()=true → `REENTRY_DETECTED`、false → `{ cliCommand: 'phasegate:complete-check', cliArgs: [] }`
- Presentation層（stop-hook.ts）: `session_id` フィールドをstdinのJSONから読み取り
