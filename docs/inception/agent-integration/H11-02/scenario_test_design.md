# シナリオテスト設計: H11-02 — Claude Code PreToolUse Hook Adapter（リンター設定保護）
> **Unit ID**: agent-integration
> **作成日**: 2026-03-20

## 1. テスト対象機能

H11-02はClaude Code PreToolUse Hook Adapterを実装する。具体的には以下を提供する:

- `biome.json`（`.biome.json`含む）、`tsconfig.json`、`package.json` の変更をブロック
- ブロック時に変更対象ファイル名を含むエラーメッセージをstderrに出力し、exitCode=2で終了
- ブロック対象外ファイルへの変更は正常通過（exitCode=0）
- `harness.config.json` のHook設定（保護対象ファイルパターンの拡張）を参照

実装: `scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts`
UseCase: `scripts/harness/agent-integration/application/usecases/handle-pre-tool-use-usecase.ts`
テスト: `scripts/harness/__tests__/integration/agent-integration/handle-pre-tool-use-usecase.test.ts`

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-H11-02-001 | biome.json への変更がブロックされること | `targetFilePaths=['biome.json']`, `toolName='Write'` | `shouldBlock=true`, `blockedFilePath='biome.json'` |
| SC-H11-02-002 | .biome.json への変更がブロックされること | `targetFilePaths=['.biome.json']`, `toolName='Write'` | `shouldBlock=true`, `blockedFilePath='.biome.json'` |
| SC-H11-02-003 | tsconfig.json への変更がブロックされること | `targetFilePaths=['tsconfig.json']`, `toolName='Write'` | `shouldBlock=true`, `blockedFilePath='tsconfig.json'` |
| SC-H11-02-004 | package.json への変更がブロックされること | `targetFilePaths=['package.json']`, `toolName='Write'` | `shouldBlock=true`, `blockedFilePath='package.json'` |
| SC-H11-02-005 | 通常のTypeScriptファイルへの変更はブロックされないこと | `targetFilePaths=['src/index.ts']`, `toolName='Write'` | `shouldBlock=false` |
| SC-H11-02-006 | 複数ファイルのうち保護対象が含まれる場合はブロックされること | `targetFilePaths=['src/foo.ts','biome.json']` | `shouldBlock=true` |
| SC-H11-02-007 | targetFilePathsが空の場合はブロックされないこと | `targetFilePaths=[]` | `shouldBlock=false` |

## 3. テスト配置

- ユニットテスト: `scripts/harness/__tests__/unit/agent-integration/protected-file-list.test.ts`
- ユニットテスト: `scripts/harness/__tests__/unit/agent-integration/hook-to-cli-translator.test.ts`（PreToolUse変換ルール）
- 統合テスト: `scripts/harness/__tests__/integration/agent-integration/handle-pre-tool-use-usecase.test.ts`

## 4. 前提条件

- `ProtectedFileList` VO: デフォルト保護対象パターン（biome.json/.biome.json/tsconfig.json/package.json）はドメイン層にハードコード（設計決定D3）
- `HookToCliTranslator.translate(PreToolUseEvent)`: ProtectedFileList.matches()でブロック判定
- `HandlePreToolUseUseCase`: ConfigQueryPortからHarnessConfigV2を参照して追加パターンを取得可能
