# シナリオテスト設計: H11-03 — Claude Code PostToolUse Hook Adapter（Biomeベース高速フォーマット+リント）
> **Unit ID**: agent-integration
> **作成日**: 2026-03-20

## 1. テスト対象機能

H11-03はClaude Code PostToolUse Hook Adapterを実装する。具体的には以下を提供する:

- PostToolUse Hook 発火時に `phasegate:lint --fast` コマンドを呼び出す（harness-api経由で統一）
- 500msタイムアウト内での完了を保証（HookTranslationResult.timeoutMs=500を宣言）
- Hook無効化設定（`ConfigQueryPort.isEnabled('post-tool-use')=false`）時は `HOOK_DISABLED` でスキップ
- タイムアウト超過時は `TIMEOUT_EXCEEDED` でスキップし警告出力
- CLI経路でも `phasegate:lint` により同等機能が実行可能

実装: `scripts/harness/agent-integration/presentation/post-tool-use-hook.ts`
UseCase: `scripts/harness/agent-integration/application/usecases/handle-post-tool-use-usecase.ts`
テスト: `scripts/harness/__tests__/integration/agent-integration/handle-post-tool-use-usecase.test.ts`

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-H11-03-001 | PostToolUse Hook が正常に `phasegate:lint --fast` を呼び出すこと | `toolName='Write'`, Hook有効, CLIExecutor: exitCode=0 | `executed=true`, `skipReason=undefined`, `cliResult.exitCode=0` |
| SC-H11-03-002 | HookTranslationResultのtimeoutMsが500に設定されること | PostToolUseEvent変換 | `timeoutMs=500` |
| SC-H11-03-003 | Hook無効設定時にスキップされること | `ConfigQueryPort.isEnabled('post-tool-use')=false` | `executed=false`, `skipReason='HOOK_DISABLED'` |
| SC-H11-03-004 | Lint失敗時に exitCode が非ゼロで返ること | CLIExecutor: exitCode=1 | `cliResult.exitCode=1` |
| SC-H11-03-005 | タイムアウト超過時に TIMEOUT_EXCEEDED でスキップされること | CLIExecutor: 500ms超過 | `executed=false`, `skipReason='TIMEOUT_EXCEEDED'` |

## 3. テスト配置

- ユニットテスト: `scripts/harness/__tests__/unit/agent-integration/hook-to-cli-translator.test.ts`（PostToolUse変換ルール）
- 統合テスト: `scripts/harness/__tests__/integration/agent-integration/handle-post-tool-use-usecase.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/agent-integration/hook/` ディレクトリ

## 4. 前提条件

- `HookToCliTranslator.translate(PostToolUseEvent)`: `{ shouldBlock: false, cliCommand: 'phasegate:lint', cliArgs: ['--fast'], expectedExitCode: 0, timeoutMs: 500 }`
- `ChildProcessCliExecutorAdapter` がtimeoutMs=500でCLIコマンドを実行し、タイムアウト超過時は TIMEOUT_EXCEEDED を返す
- `ConfigQueryPort.isEnabled('post-tool-use')` がfalseの場合はCLI呼び出しを行わない
