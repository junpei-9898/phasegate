# ユニットテストロジック設計計画: agent-integration

> **作成日**: 2026-03-19
> **Wave**: 2

## 1. スコープ

- **対象**: `docs/product/construction/agent-integration/unit_test_design.md`
- **テストケース総数**: 84件（エンティティ×1 11件 + VO×4 38件 + DS×2 21件 + 境界値 14件）
- **実装先ソース**: `scripts/harness/` 配下（Wave 2新規 Unit）

## 2. テストファイル構成（計画）

| テストファイル | 対象クラス | ケース数 |
|--------------|----------|---------|
| `scripts/harness/__tests__/unit/agent-integration/reentry-guard.test.ts` | ReentryGuard（エンティティ） | 11 |
| `scripts/harness/__tests__/unit/agent-integration/hook-event.test.ts` | HookEvent（VO）| 8 |
| `scripts/harness/__tests__/unit/agent-integration/protected-file-list.test.ts` | ProtectedFileList（VO） | 12 |
| `scripts/harness/__tests__/unit/agent-integration/hook-translation-result.test.ts` | HookTranslationResult（VO） | 11 |
| `scripts/harness/__tests__/unit/agent-integration/fallback-capability-spec.test.ts` | FallbackCapabilitySpec（VO） | 7 |
| `scripts/harness/__tests__/unit/agent-integration/hook-to-cli-translator.test.ts` | HookToCliTranslator（DS） | 11 |
| `scripts/harness/__tests__/unit/agent-integration/fallback-verification-service.test.ts` | FallbackVerificationService（DS） | 10 |

※境界値(UT-BV-*)は各ファイルに分散して記載（14件）

## 3. モック/ファクトリ設計方針

### ファクトリ関数配置

`scripts/harness/__tests__/helpers/test-helpers.ts` に追加：

- `createPreToolUseEvent(overrides?)`: デフォルト `{ hookType: 'pre-tool-use', toolName: 'Write', targetFilePaths: ['src/app.ts'] }`
- `createPostToolUseEvent(overrides?)`: デフォルト `{ hookType: 'post-tool-use', toolName: 'Write', affectedFilePaths: ['src/app.ts'] }`
- `createStopEvent(sessionId?)`: デフォルト `{ hookType: 'stop', sessionId: 'sess-001' }`
- `createProtectedFileList(patterns?)`: デフォルト `{ patterns: ['biome.json', 'tsconfig.json'] }`
- `createHookTranslationResult(overrides?)`: デフォルト `{ shouldBlock: false, cliArgs: [], expectedExitCode: 0 }`
- `createFallbackCapabilitySpec(overrides?)`: デフォルト `{ supportedCommands: ['phasegate:lint'], noAgentApiImports: true }`

### モック方針

- **エンティティ・VO**: モック不使用（実体を直接生成）
- **HookToCliTranslator のポート**: `vi.fn()` でモック
  - `ConfigQueryPort`, `ReentryGuardStatePort`, `CliCommandRegistryPort`
  - `ProtectedFileList.matches()` は実体を使用（VO）
- **FallbackVerificationService のポート**: `vi.fn()` でモック
  - `ImportAnalyzerPort`, `CliCommandRegistryPort`

## 4. QA（不明点・確認事項）

なし

## 5. 前提条件・リスク

- `ReentryGuard` は状態を持つエンティティ（mutable）。各テストで独立したインスタンスを生成する
- `HookEvent` は Union型（PreToolUseEvent / PostToolUseEvent / StopEvent）のため、各バリアントの判別ロジックもテスト
- `ProtectedFileList.matches()` は `micromatch` ライブラリへの依存が考えられるが、Portではないため実体を使用
- `HookTranslationResult` の INV-2/3 は相互排他的不変条件（shouldBlock=true かつ cliCommand 設定は禁止）
- `FallbackVerificationService` はエラーを収集して返す（例外をスローしない）設計
