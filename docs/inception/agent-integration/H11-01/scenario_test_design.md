# シナリオテスト設計: H11-01 — コア品質能力のCLI/FSフォールバック定義
> **Unit ID**: agent-integration
> **作成日**: 2026-03-20

## 1. テスト対象機能

H11-01はL1-L4全バリデータのCLI/FSフォールバック保証を実装する。具体的には以下を検証する:

- coreモジュール（domain/application層）がエージェント固有API（`@anthropic-ai/claude-code`等）をimportしていないこと
- `FallbackCapabilitySpec` で宣言されたCLIコマンドが全てCliCommandRegistryPortに存在すること
- Claude Code Hookが無効な環境でも全バリデータが正常動作できることの宣言的保証

実装: `scripts/harness/agent-integration/application/usecases/verify-fallback-capability-usecase.ts`
テスト: `scripts/harness/__tests__/integration/agent-integration/verify-fallback-capability-usecase.test.ts`

## 2. シナリオテストケース

| テストID | シナリオ | 入力 | 期待結果 |
|---------|---------|------|---------|
| SC-H11-01-001 | フォールバック仕様が有効なCLIコマンドのみを宣言している場合に検証が通ること | `supportedCommands=['harness:lint','harness:complete-check']`, `noAgentApiImports=true` + CliCommandRegistryPort: 両コマンド存在あり + ImportAnalyzerPort: エージェント固有importなし | `HarnessError[]` が空配列（検証通過） |
| SC-H11-01-002 | 宣言コマンドが未登録の場合に検証が失敗すること | `supportedCommands=['harness:unknown']` + CliCommandRegistryPort: コマンド存在なし | `HarnessError[]` に未登録コマンドエラーが含まれる |
| SC-H11-01-003 | noAgentApiImports=true かつ エージェントAPIを検出した場合に検証が失敗すること | `noAgentApiImports=true` + ImportAnalyzerPort: `@anthropic-ai/claude-code` import検出 | `HarnessError[]` にエージェントAPI参照エラーが含まれる |
| SC-H11-01-004 | noAgentApiImports=false の場合はimport検査をスキップすること | `noAgentApiImports=false` + ImportAnalyzerPort: 何も返さない（呼ばれない） | `HarnessError[]` が空配列（importチェックスキップ） |
| SC-H11-01-005 | supportedCommandsが1件以上必須であること（INV-5） | `supportedCommands=[]` | `FallbackCapabilitySpec` 生成失敗 |

## 3. テスト配置

- ユニットテスト: `scripts/harness/__tests__/unit/agent-integration/fallback-capability-spec.test.ts`
- ユニットテスト: `scripts/harness/__tests__/unit/agent-integration/fallback-verification-service.test.ts`
- 統合テスト: `scripts/harness/__tests__/integration/agent-integration/verify-fallback-capability-usecase.test.ts`

## 4. 前提条件

- `FallbackCapabilitySpec` VO: `supportedCommands: CommandName[]`（1件以上必須）, `noAgentApiImports: boolean`
- `FallbackVerificationService` がImportAnalyzerPort・CliCommandRegistryPortに依存
- `VerifyFallbackCapabilityUseCase` がUseCaseとして調停
