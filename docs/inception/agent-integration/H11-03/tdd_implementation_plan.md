# TDD実装計画: H11-03 (agent-integration)

## 1. スコープ
- 対象ストーリー: H11-03 Claude Code PostToolUse Hook Adapter（Biomeベース高速フォーマット+リント）
- 影響する層: domain（HookToCliTranslator PostToolUse変換ルール、timeoutMs=500宣言）、application（HandlePostToolUseUseCase）、infrastructure（ChildProcessCliExecutorAdapter タイムアウト制御）、presentation（post-tool-use-hook.ts）

## 2. 前提条件検証
- ✅ 実装準備完了（遡及記録）

## 3. 実装状況（遡及記録）

### 実装済みファイル

| ファイル | 説明 |
|---------|------|
| `scripts/harness/agent-integration/domain/services/hook-to-cli-translator.ts` | PostToolUse変換ルール: `{ cliCommand: 'harness:lint', cliArgs: ['--fast'], timeoutMs: 500 }` |
| `scripts/harness/agent-integration/application/usecases/handle-post-tool-use-usecase.ts` | HandlePostToolUseUseCase（Hook無効/タイムアウト/正常フロー） |
| `scripts/harness/agent-integration/infrastructure/adapters/child-process-cli-executor-adapter.ts` | ChildProcessCliExecutorAdapter（timeoutMs制御、TIMEOUT_EXCEEDED返却） |
| `scripts/harness/agent-integration/infrastructure/adapters/harness-api-cli-command-registry-adapter.ts` | HarnessApiCliCommandRegistryAdapter |
| `scripts/harness/agent-integration/presentation/post-tool-use-hook.ts` | PostToolUse Hook エントリポイント（stdin JSON読み取り → UseCase呼び出し → exitCode制御） |

### テスト状況
- ユニットテスト: ✅ 完了（`hook-to-cli-translator.test.ts` PostToolUse変換ルール）
- 統合テスト: ✅ 完了（`handle-post-tool-use-usecase.test.ts`, `hook/` ディレクトリ）
- E2Eテスト: ✅ 完了（`cli-harness.test.ts`）

## 4. QA
なし（遡及記録）
