# ITテスト設計計画: agent-integration

> **作成日**: 2026-03-19
> **対応ストーリー**: H11-01, H11-02, H11-03, H11-04
> **参照文書**:
> - `docs/product/construction/agent-integration/logical_design.md`
> - `docs/product/units/integration_contract.md`
> - `docs/product/construction/agent-integration/domain_model.md`
> - `docs/principles/testing-rules.md`

---

## 1. スコープ

### 対象Unit

agent-integration は「薄いAdapter層」として Claude Code Hook と harness-api CLI の橋渡しを担う。
ITテストでは以下のコンポーネントを対象とする。

- **Application層 UseCase × 4**（論理設計 §4）
- **Infrastructure層 Adapter × 5**（論理設計 §5）
- **Presentation層 Hook Adapter × 3**（論理設計 §6）
- **Hook Flowの統合**（UseCase → Adapter の結合フロー）

---

## 2. テスト対象分析

### UseCase

| UseCase名 | 依存Port/Service数 | テストケース概算 |
|-----------|-------------------|---------------|
| VerifyFallbackCapabilityUseCase | FallbackVerificationService（→ImportAnalyzerPort, CliCommandRegistryPort） | 5〜6件 |
| HandlePreToolUseUseCase | HookToCliTranslator（→ConfigQueryPort） | 6〜8件 |
| HandlePostToolUseUseCase | HookToCliTranslator（→ConfigQueryPort）, CliExecutorPort | 6〜8件 |
| HandleStopUseCase | HookToCliTranslator（→ReentryGuardStatePort）, ReentryGuard, CliExecutorPort | 7〜9件 |

### Infrastructure Adapter（Repository相当）

| Adapter名 | 実装ポート | テストケース概算 |
|-----------|-----------|---------------|
| EnvFileReentryGuardStateAdapter | ReentryGuardStatePort | 8〜10件（env戦略/file戦略） |
| HarnessConfigConfigQueryAdapter | ConfigQueryPort | 4〜6件 |
| HarnessApiCliCommandRegistryAdapter | CliCommandRegistryPort | 3〜4件 |
| TsMorphImportAnalyzerAdapter | ImportAnalyzerPort | 4〜6件 |
| ChildProcessCliExecutorAdapter | CliExecutorPort | 4〜5件 |

### Presentation Hook Adapter（Controller/API相当）

| スクリプト | Hook種別 | テストケース概算 |
|-----------|---------|---------------|
| pre-tool-use-hook.ts | PreToolUse | 5〜7件 |
| post-tool-use-hook.ts | PostToolUse | 5〜7件 |
| stop-hook.ts | Stop | 5〜7件 |

### 統合フローテスト

| フロー | テストケース概算 |
|--------|---------------|
| Hook Flowエンドツーエンド統合 | 5〜6件 |

---

## 3. テスト方針

### UseCase ITテスト方針

- **Domainモデルは実体を使用**、Port・CliExecutorPortのみをテストダブル（vi.fn()）にする
- `testing-rules.md` の「Portは管理下にない外部依存 → モック、Domainは管理下にある外部依存 → 実体」方針に従う
- HandleStopUseCaseは `try/finally` によるdeactivate保証を検証するケースを必須で含める
- HandlePostToolUseUseCaseはタイムアウト超過（TIMEOUT_EXCEEDED）スキップを検証する

### Infrastructure Adapter ITテスト方針

- **実際のファイルシステム・環境変数** を使用した統合テスト（インメモリ代替なし）
- 各テスト後にクリーンアップ処理（tmpファイル削除、環境変数リセット）を実施
- EnvFileReentryGuardStateAdapterは `strategy: 'env'` と `strategy: 'file'` の双方を検証
- HarnessConfigConfigQueryAdapterはfixtureの `phasegate.config.json` を使用

### Presentation Hook Adapter テスト方針

- **stdin JSON入力をシミュレート**し、exit codeを検証
- UseCase・Adapterはモックして、Presentation層の責務（JSON解析・exit code）のみを検証
- エラー時（stderr出力）の検証を含める

### フロー統合テスト方針

- EnvFileReentryGuardStateAdapter（実ファイルシステム）＋UseCase実体の結合で検証
- ChildProcessCliExecutorAdapterはモック（実際のCLI実行は行わない）

### モック/スタブの使用方針

| コンポーネント | UseCase ITテスト | Adapter ITテスト | Presentation ITテスト |
|--------------|----------------|-----------------|----------------------|
| Domain層（エンティティ/VO/サービス） | 実体 | 実体 | — |
| ReentryGuardStatePort | モック | 実体（Adapter直テスト） | モック |
| ImportAnalyzerPort | モック | 実体（Adapter直テスト） | モック |
| CliCommandRegistryPort | モック | 実体（Adapter直テスト） | モック |
| ConfigQueryPort | モック | 実体（Adapter直テスト） | モック |
| CliExecutorPort | モック | 実体（Adapter直テスト） | モック |
| UseCase | — | — | モック |

### DBテストの方針

agent-integrationはDBを持たない。状態管理は環境変数またはtmpファイルで行う。
「DBテスト」の代替として、実ファイルシステムを使ったAdapterの統合テストを実施する。

### 認証・認可のテスト方針

agent-integrationは認証認可機構を持たない（`integration_contract.md §8` 参照）。

---

## 4. QA（不明点・確認事項）

### [Question] Q1: ChildProcessCliExecutorAdapterの統合テスト方針

実際のCLIプロセス（`npx tsx ...`）を起動するAdapterの統合テストにおいて、harness:lintやharness:complete-checkが実際に実行可能な状態であることが前提か、それとも常にモックCLIを用意するか。

**推奨案**: Adapter単体のITテストはモックCLIスクリプト（exit code 0/1/2を返すだけのスクリプト）を用意して検証する。実際のharness CLIとの結合はE2Eテストで担保する。

[Answer]
（人間が回答を記入）

### [Question] Q2: TsMorphImportAnalyzerAdapterのテスト用ソースファイル

ImportAnalyzerPortの統合テストでは、エージェント固有API（`@anthropic-ai/claude-code`）をimportするテスト用フィクスチャファイルが必要か。また、そのフィクスチャの配置先はどこか。

**推奨案**: `scripts/harness/__tests__/integration/agent-integration/fixtures/` 配下にテスト用TypeScriptファイルを作成する（実際のimport文を含む）。ts-morphは実ファイルを解析するため、フィクスチャファイルが必要。

[Answer]
（人間が回答を記入）

---

## 5. 前提条件・リスク

### 前提条件

- Wave 1全Unit（harness-error, config-foundation等）の型定義が確定済みであること
- `scripts/harness/shared-kernel/harness-error.ts` が参照可能であること
- `phasegate.config.json` のフィクスチャファイルが存在すること（またはテスト用に作成すること）
- `micromatch` パッケージが依存関係として追加済みであること

### リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| EnvFileReentryGuardStateAdapterが環境変数を汚染するテスト間干渉 | 高 | `afterEach`で必ず`clearActive()`を呼ぶ |
| ChildProcessCliExecutorAdapterの実CLIテストは実行環境依存 | 中 | モックCLIスクリプトを使用 |
| TsMorphImportAnalyzerAdapterのts-morphは起動が重い | 中 | Vitest worker単位でProjectインスタンスを再利用 |
| Presentation層のexit codeテストはprocess.exitモックが必要 | 中 | spawnを使った子プロセス実行でexit codeを検証 |
