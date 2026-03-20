# TDD実装計画: H11-02 (agent-integration)

## 1. スコープ
- 対象ストーリー: H11-02 Claude Code PreToolUse Hook Adapter（リンター設定保護）
- 影響する層: domain（ProtectedFileList VO, HookToCliTranslator PreToolUse変換ルール）、application（HandlePreToolUseUseCase）、presentation（pre-tool-use-hook.ts）

## 2. 前提条件検証
- ✅ 実装準備完了（遡及記録）

## 3. 実装状況（遡及記録）

### 実装済みファイル

| ファイル | 説明 |
|---------|------|
| `scripts/harness/agent-integration/domain/value-objects/protected-file-list.ts` | ProtectedFileList VO（デフォルト保護パターン: biome.json/.biome.json/tsconfig.json/package.json） |
| `scripts/harness/agent-integration/domain/services/hook-to-cli-translator.ts` | HookToCliTranslator（PreToolUse変換ルール: ProtectedFileList.matches()でブロック判定） |
| `scripts/harness/agent-integration/application/usecases/handle-pre-tool-use-usecase.ts` | HandlePreToolUseUseCase |
| `scripts/harness/agent-integration/infrastructure/adapters/harness-config-config-query-adapter.ts` | ConfigQueryPort実装 |
| `scripts/harness/agent-integration/presentation/pre-tool-use-hook.ts` | PreToolUse Hook エントリポイント（stdin JSON読み取り → UseCase呼び出し → exitCode制御） |

### テスト状況
- ユニットテスト: ✅ 完了（`protected-file-list.test.ts`, `hook-to-cli-translator.test.ts`）
- 統合テスト: ✅ 完了（`handle-pre-tool-use-usecase.test.ts`）
- E2Eテスト: ✅ 完了（`cli-harness.test.ts`）

## 4. QA
なし（遡及記録）
