# TDD実装計画: H11-04 (agent-integration)

## 1. スコープ
- 対象ストーリー: H11-04 Claude Code Stop Hook Adapter（テストゲート + ci-check + 無限ループ防止）
- 影響する層: domain（ReentryGuard エンティティ、HookToCliTranslator Stop変換ルール）、application（HandleStopUseCase）、infrastructure（EnvFileReentryGuardStateAdapter、ChildProcessCliExecutorAdapter）、presentation（stop-hook.ts）

## 2. 前提条件検証
- ✅ 実装準備完了（遡及記録）

## 3. 実装状況（遡及記録）

### 実装済みファイル

| ファイル | 説明 |
|---------|------|
| `scripts/harness/agent-integration/domain/entities/reentry-guard.ts` | ReentryGuard エンティティ（activate/isActive/deactivate、INV-1: 二重activate禁止） |
| `scripts/harness/agent-integration/domain/services/hook-to-cli-translator.ts` | Stop変換ルール: isActive=true → REENTRY_DETECTED、false → harness:complete-check |
| `scripts/harness/agent-integration/application/usecases/handle-stop-usecase.ts` | HandleStopUseCase（ReentryGuardライフサイクル管理、CLI呼び出し） |
| `scripts/harness/agent-integration/infrastructure/adapters/env-file-reentry-guard-state-adapter.ts` | EnvFileReentryGuardStateAdapter（strategy: 'env'）|
| `scripts/harness/agent-integration/presentation/stop-hook.ts` | Stop Hook エントリポイント（stdin JSON読み取り → UseCase呼び出し → exitCode制御） |

### テスト状況
- ユニットテスト: ✅ 完了（`reentry-guard.test.ts`, `hook-to-cli-translator.test.ts` Stop変換ルール）
- 統合テスト: ✅ 完了（`handle-stop-usecase.test.ts`, `env-file-reentry-guard-state-adapter.test.ts`）
- E2Eテスト: ✅ 完了（`cli-harness.test.ts`）

## 4. QA
なし（遡及記録）
