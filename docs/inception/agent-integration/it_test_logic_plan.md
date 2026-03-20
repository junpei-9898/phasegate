# ITテストロジック設計計画: agent-integration

## 1. スコープ

- 対象テストケース設計: `docs/product/construction/agent-integration/it_test_design.md`
- 参照論理設計: `docs/product/construction/agent-integration/logical_design.md`
- テストケース総数: 約83件
  - UseCase: 27件（VerifyFallback×6, HandlePreToolUse×8, HandlePostToolUse×6, HandleStop×7）
  - Infrastructure Adapter: 30件（EnvFileReentryGuard×10, HarnessConfigQuery×6, CliCommandRegistry×4, TsMorphImportAnalyzer×5, ChildProcessCliExecutor×5）
  - Presentation Hook Adapter: 16件（PreToolUse×7, PostToolUse×7, StopHook×7）
  - Hook Flow Integration: 5件

---

## 2. テストファイル構成（計画）

| テストファイル | 対象コンポーネント | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/integration/agent-integration/verify-fallback-capability-usecase.test.ts` | VerifyFallbackCapabilityUseCase | 6 |
| `scripts/harness/__tests__/integration/agent-integration/handle-pre-tool-use-usecase.test.ts` | HandlePreToolUseUseCase | 8 |
| `scripts/harness/__tests__/integration/agent-integration/handle-post-tool-use-usecase.test.ts` | HandlePostToolUseUseCase | 6 |
| `scripts/harness/__tests__/integration/agent-integration/handle-stop-usecase.test.ts` | HandleStopUseCase | 7 |
| `scripts/harness/__tests__/integration/agent-integration/env-file-reentry-guard-state-adapter.test.ts` | EnvFileReentryGuardStateAdapter | 10 |
| `scripts/harness/__tests__/integration/agent-integration/harness-config-config-query-adapter.test.ts` | HarnessConfigConfigQueryAdapter | 6 |
| `scripts/harness/__tests__/integration/agent-integration/harness-api-cli-command-registry-adapter.test.ts` | HarnessApiCliCommandRegistryAdapter | 4 |
| `scripts/harness/__tests__/integration/agent-integration/ts-morph-import-analyzer-adapter.test.ts` | TsMorphImportAnalyzerAdapter | 5 |
| `scripts/harness/__tests__/integration/agent-integration/child-process-cli-executor-adapter.test.ts` | ChildProcessCliExecutorAdapter | 5 |
| `scripts/harness/__tests__/integration/agent-integration/hook/pre-tool-use-hook.test.ts` | pre-tool-use-hook.ts | 7 |
| `scripts/harness/__tests__/integration/agent-integration/hook/post-tool-use-hook.test.ts` | post-tool-use-hook.ts | 7 |
| `scripts/harness/__tests__/integration/agent-integration/hook/stop-hook.test.ts` | stop-hook.ts | 7 |
| `scripts/harness/__tests__/integration/agent-integration/hook-flow-integration.test.ts` | Hook Flow Integration | 5 |

---

## 3. モック・フィクスチャ設計方針

### UseCase テスト
- `ImportAnalyzerPort`, `CliCommandRegistryPort` → `vi.fn()` でモック
- `ConfigQueryPort`, `CliExecutorPort`, `ReentryGuardStatePort` → `vi.fn()` でモック
- `FallbackCapabilitySpec`, `FallbackVerificationService`, `HookToCliTranslator`, `ProtectedFileList`, `ReentryGuard` → 実体を使用（Domain層モック禁止）

### Adapter テスト
- **EnvFileReentryGuardStateAdapter**:
  - `strategy: 'env'`：実際の `process.env` を操作。`afterEach` でクリーンアップ
  - `strategy: 'file'`：実際のtmpファイルを作成。`afterEach` でクリーンアップ（`clearActive()`使用）
- **HarnessConfigConfigQueryAdapter**: フィクスチャ JSON ファイルを実際のファイルとして参照
- **HarnessApiCliCommandRegistryAdapter**: 静的コマンドリストのため実体テスト（モック不要）
- **TsMorphImportAnalyzerAdapter**: フィクスチャ `.ts` ファイルを実際のファイルとして参照
- **ChildProcessCliExecutorAdapter**: フィクスチャ `.ts` スクリプトを子プロセスとして実際に起動

### Presentation Hook Adapter テスト
- スクリプトを `child_process.spawn` / `execFile` で子プロセスとして起動
- stdinにJSONを書き込み、exit codeとstderr/stdoutを検証
- UseCase実体への依存のため、テスト環境では実ハーネスCLIが必要か、または UseCase をモック注入可能な設計を前提とする

### Hook Flow Integration テスト
- `EnvFileReentryGuardStateAdapter`（実ファイルシステム）+ Domain 実体を使用
- `CliExecutorPort` のみ `vi.fn()` でモック

### シードデータ配置
```
scripts/harness/__tests__/integration/agent-integration/fixtures/
├── harness-config-enabled.json        # cascadeUpdate: true, agentLessonCollection: true
├── harness-config-disabled.json       # cascadeUpdate: false, agentLessonCollection: false
├── no-agent-api.ts                    # import { readFile } from 'node:fs/promises'
├── with-agent-api.ts                  # import { query } from '@anthropic-ai/claude-code'
├── mock-cli-exit-0.ts                 # process.exit(0)
├── mock-cli-exit-1.ts                 # process.exit(1)
└── mock-cli-slow.ts                   # setTimeout 1000ms → process.exit(0)
```

---

## 4. テストヘルパー設計

### インポートパス
- ルート直下（UseCase・Adapterテスト）: `../../helpers/test-helpers`（2段階）
- `hook/` サブディレクトリ: `../../../helpers/test-helpers`（3段階）

### 共通モック生成パターン（it_test_design.md §7のパターンを採用）
```typescript
const mockReentryGuardStatePort = {
  readActive: vi.fn(),
  writeActive: vi.fn(),
  clearActive: vi.fn(),
};
const mockCliExecutorPort = { execute: vi.fn() };
const mockConfigQueryPort = {
  isHookEnabled: vi.fn(),
  getProtectedFilePatterns: vi.fn(),
};
```

---

## 5. QA（不明点・確認事項）

### [Question] Q1: Presentation Hook Adapter テストの UseCase モック方法
Hook スクリプト（`pre-tool-use-hook.ts` 等）を子プロセス起動でテストする場合、UseCase 実体への依存があるため、実際のHarness CLIが起動済みである必要がある可能性がある。

**推奨案**: Presentation Hook テストは UseCase を DI可能な形で設計し、テスト環境では UseCase をモック注入する方式を採用する。あるいは、スクリプト起動ではなく UseCase/Handler を直接インスタンス化してテストする（E2E形式は統合フローテストに委ねる）。

[Answer]
（人間が回答を記入）

---

## 6. 前提条件・リスク

- **TsMorphImportAnalyzerAdapter**: `ts-morph` ライブラリが依存関係に含まれていること（package.json確認要）
- **EnvFileReentryGuardStateAdapter**: 実ファイルシステム操作のため、テスト後の確実なクリーンアップが必要
- **ChildProcessCliExecutorAdapter**: フィクスチャスクリプトを `ts-node` か事前コンパイルして実行する必要がある
- **DB不要**: LocalCLIツール
