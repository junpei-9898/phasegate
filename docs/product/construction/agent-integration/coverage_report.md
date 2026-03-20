# テストカバレッジレポート: agent-integration

> **Unit ID**: agent-integration
> **作成日**: 2026-03-19
> **対応ストーリー**: H11-01〜H11-04
> **参照文書**:
> - `docs/product/units/agent_integration_unit.md`
> - `docs/product/construction/agent-integration/domain_model.md`
> - `docs/product/construction/agent-integration/logical_design.md`
> - `docs/product/construction/agent-integration/unit_test_design.md`
> - `docs/product/construction/agent-integration/it_test_design.md`
> - `docs/product/units/integration_contract.md`

---

## 1. サマリー

| 観点 | 状態 | 備考 |
|------|------|------|
| 受け入れ基準カバレッジ | 概ね良好（AC-4のみ部分的） | 16ACのうち15ACがカバー済み。AC-4（ドキュメント）はテストケース対象外 |
| ドメインロジックカバレッジ | 良好 | 5つの不変条件（INV-1〜5）すべてにテストケースが存在 |
| UseCaseカバレッジ | 良好 | 4UseCaseの正常系/異常系/境界値が網羅されている |
| APIカバレッジ | 良好 | Hook Adapter 3本すべてにUT/ITテストケースが存在 |
| Engineering Perspective | 概ね良好（改善点3件） | 詳細はセクション6参照 |

**ユニットテスト総数**: 84件（unit_test_design.md）
**ITテスト総数**: 約82件（it_test_design.md）
**合計テストケース数**: 約166件

---

## 2. 受け入れ基準カバレッジ詳細

### H11-01: CLI/FSフォールバック定義

| AC | 内容 | 対応テストケース | カバー状態 |
|----|------|----------------|-----------|
| AC-1 | L1-L4全バリデータがCLIコマンドから直接実行可能であることを検証するテスト | IT-UC-VerifyFallback-001〜003（VerifyFallbackCapabilityUseCase正常系）、IT-REPO-CliCommandRegistry-001〜004 | カバー済み |
| AC-2 | Claude Code Hookが無効な環境でも全バリデータが正常動作することを検証するテスト | IT-UC-VerifyFallback-002（noAgentApiImports=falseでImportAnalyzer解析スキップ）、UT-FVS-002 | カバー済み |
| AC-3 | coreモジュールが特定エージェントAPI（Claude Code Hook API等）をimportしていないことを検証するテスト | UT-FVS-010〜012（ImportAnalyzerPort violation検出）、IT-UC-VerifyFallback-004（エージェントAPI検出）、IT-REPO-ImportAnalyzer-001〜005 | カバー済み |
| AC-4 | CLI/FSフォールバックの利用方法ドキュメント | なし（ドキュメント成果物であり、テストケースの対象外） | **対象外**（ドキュメント要件） |

**H11-01 カバレッジ**: 3/3テスト可能AC（AC-4はドキュメント要件のため除外）

---

### H11-02: PreToolUse Hook Adapter

| AC | 内容 | 対応テストケース | カバー状態 |
|----|------|----------------|-----------|
| AC-5 | `biome.json`（`.biome.json`含む）、`tsconfig.json`、`package.json`の変更をブロック | IT-UC-HandlePreToolUse-001〜003（各ファイルのブロック）、IT-API-PreToolUse-001〜003、UT-HTC-001（ProtectedFileList match）、UT-PFL-020〜025（matchesメソッド） | カバー済み |
| AC-6 | ブロック時に変更対象ファイル名を含むHarnessErrorを表示 | IT-API-PreToolUse-005（stderrにブロックメッセージあり）、UT-RG-021（エラーメッセージ内容検証の類似パターン） | **部分的**（HarnessErrorへのファイル名包含が明示的ケースなし） |
| AC-7 | ブロック対象外ファイルへの変更は正常に実行 | IT-UC-HandlePreToolUse-003、IT-API-PreToolUse-004（exit code 0）、UT-HTC-002（shouldBlock=false） | カバー済み |

**H11-02 カバレッジ**: 2/3完全カバー（AC-6は部分的）

---

### H11-03: PostToolUse Hook Adapter

| AC | 内容 | 対応テストケース | カバー状態 |
|----|------|----------------|-----------|
| AC-8 | 正規経路として `harness:lint --fast` を呼び出す | UT-HTC-010（`cliCommand: 'harness:lint', cliArgs: ['--fast']`）、IT-UC-HandlePostToolUse-001（harness:lint --fast実行）、IT-UC-HookFlow-003 | カバー済み |
| AC-9 | 500msタイムアウト内での完了を保証 | UT-HTC-010（`timeoutMs: 500`のHookTranslationResult）、IT-UC-HandlePostToolUse-004（TIMEOUT_EXCEEDED）、IT-REPO-CliExecutor-004〜005 | カバー済み |
| AC-10 | Hook未使用時はCLI（`harness:lint`）で同等機能が実行可能 | IT-UC-HandlePostToolUse-003（HOOK_DISABLED）、IT-API-PostToolUse-005（スキップシナリオ） | カバー済み |
| AC-11 | Hook実行テストの存在 | IT-API-PostToolUse-003〜004（Presentation層でHookスクリプト実行テスト）、IT-UC-HookFlow-003 | カバー済み |

**H11-03 カバレッジ**: 4/4完全カバー

---

### H11-04: Stop Hook Adapter

| AC | 内容 | 対応テストケース | カバー状態 |
|----|------|----------------|-----------|
| AC-12 | `harness:complete-check` を呼び出す（`pnpm test` + L1-L4全バリデータ） | UT-HTC-020（`cliCommand: 'harness:complete-check'`）、IT-UC-HandleStop-001（harness:complete-check実行）、IT-UC-HookFlow-001 | カバー済み |
| AC-13 | `harness:complete-check` がfailを返した場合、エージェント完了を阻止 | IT-UC-HandleStop-004（exitCode=1時のcliResult返却）、IT-API-StopHook-004（complete-check失敗シナリオ→exit code 1） | カバー済み |
| AC-14 | `stop_hook_active` フラグで再入を検出し、無限ループを防止 | UT-RG-010〜031（ReentryGuard状態遷移全般）、UT-HTC-021（REENTRY_DETECTED）、IT-UC-HandleStop-003、IT-UC-HookFlow-002 | カバー済み |
| AC-15 | 再入検出時にStop Hookをスキップし、適切な警告メッセージを表示 | IT-API-StopHook-005（stderrに再入検出メッセージ）、IT-UC-HandleStop-003（skipReason='REENTRY_DETECTED'） | カバー済み |
| AC-16 | Hook未使用時はCLI（`harness:complete-check`相当）で同等の完了チェックが実行可能 | IT-UC-VerifyFallback-001（`harness:complete-check`コマンドがCLI Command Registryに存在）、IT-REPO-CliCommandRegistry-002 | カバー済み |

**H11-04 カバレッジ**: 5/5完全カバー

---

### 全体AC カバレッジサマリー

| AC | カバー状態 |
|----|-----------|
| AC-1〜AC-3（H11-01テスト可能分） | 完全カバー |
| AC-4（H11-01ドキュメント要件） | 対象外 |
| AC-5（H11-02） | 完全カバー |
| AC-6（H11-02ブロックメッセージ） | 部分的カバー |
| AC-7（H11-02） | 完全カバー |
| AC-8〜AC-11（H11-03） | 完全カバー |
| AC-12〜AC-16（H11-04） | 完全カバー |

**完全カバー: 14/15テスト可能AC。部分的: 1件（AC-6）。**

---

## 3. ドメインロジックカバレッジ詳細

### 3.1 不変条件カバレッジ

| 不変条件 | 内容 | 対応テストケース | 状態 |
|---------|------|----------------|------|
| INV-1 | ReentryGuard: `activate()`はisActive()=falseの状態でのみ呼び出し可能 | UT-RG-020（active状態でactivate→HarnessError）、UT-RG-021（エラーメッセージ内容）、UT-RG-031（シーケンス視点）、UT-BV-007 | 完全カバー |
| INV-2 | HookTranslationResult: `shouldBlock=true`の場合、`cliCommand`はundefined | UT-HTR-010（INV-2違反→HarnessError）、UT-HTR-011（エラーメッセージ）、UT-BV-005 | 完全カバー |
| INV-3 | HookTranslationResult: `skipReason`が存在する場合、`cliCommand`はundefined | UT-HTR-020（INV-3違反→HarnessError）、UT-HTR-021（エラーメッセージ）、UT-BV-006 | 完全カバー |
| INV-4 | ProtectedFileList: `patterns`は1件以上 | UT-PFL-010（空配列→HarnessError）、UT-PFL-011（エラーメッセージ）、UT-BV-001 | 完全カバー |
| INV-5 | FallbackCapabilitySpec: `supportedCommands`は1件以上 | UT-FCS-010（空配列→HarnessError）、UT-FCS-011（エラーメッセージ）、UT-BV-003 | 完全カバー |

### 3.2 状態遷移カバレッジ（ReentryGuard）

| 状態遷移 | 対応テストケース | 状態 |
|---------|----------------|------|
| 初期状態: inactive（isActive()=false） | UT-RG-001 | カバー済み |
| inactive → active（activate()） | UT-RG-010 | カバー済み |
| active → inactive（deactivate()） | UT-RG-011 | カバー済み |
| inactive → inactive（deactivate()冪等性） | UT-RG-012 | カバー済み |
| active → active（activate()禁止・INV-1） | UT-RG-020、UT-RG-031 | カバー済み |
| activate → deactivate → activate（再利用） | UT-RG-030 | カバー済み |

### 3.3 HookToCliTranslator変換ルールカバレッジ

| HookEvent種別 | 変換ルール | 対応テストケース | 状態 |
|-------------|---------|----------------|------|
| PreToolUse: ProtectedFileList一致→ブロック | `{ shouldBlock: true }` | UT-HTC-001、UT-HTC-003（複数パスの1件一致） | カバー済み |
| PreToolUse: 非一致→通過 | `{ shouldBlock: false }` | UT-HTC-002 | カバー済み |
| PreToolUse: 空パス→通過 | `{ shouldBlock: false }` | UT-HTC-004、UT-BV-008 | カバー済み |
| PostToolUse: 有効→lint実行 | `{ cliCommand: 'harness:lint', timeoutMs: 500 }` | UT-HTC-010 | カバー済み |
| PostToolUse: 無効→HOOK_DISABLED | `{ skipReason: 'HOOK_DISABLED' }` | UT-HTC-011、UT-BV-009 | カバー済み |
| Stop: inactive→complete-check実行 | `{ cliCommand: 'harness:complete-check' }` | UT-HTC-020 | カバー済み |
| Stop: active→REENTRY_DETECTED | `{ skipReason: 'REENTRY_DETECTED' }` | UT-HTC-021、UT-BV-010 | カバー済み |
| コマンド未登録（CliCommandRegistryPort） | HarnessError throw | UT-HTC-030 | カバー済み |

### 3.4 FallbackVerificationServiceカバレッジ

| 検証ルール | 対応テストケース | 状態 |
|---------|----------------|------|
| noAgentApiImports=true + importなし → violations=[] | UT-FVS-001 | カバー済み |
| noAgentApiImports=false → importチェックスキップ | UT-FVS-002、UT-FVS-012、UT-BV-014 | カバー済み |
| importあり（単一） → violation 1件 | UT-FVS-010 | カバー済み |
| importあり（複数モジュール） → violation 複数件 | UT-FVS-011 | カバー済み |
| コマンド未登録（単一） → violation 1件 | UT-FVS-020 | カバー済み |
| コマンド未登録（複数） → violation 複数件 | UT-FVS-021 | カバー済み |
| import + コマンド未登録の複合violation | UT-FVS-030 | カバー済み |

**ドメインロジック総評: 全不変条件・全変換ルール・全状態遷移がカバーされている。カバレッジは完全。**

---

## 4. UseCaseカバレッジ詳細

### 4.1 VerifyFallbackCapabilityUseCase（H11-01）

| シナリオ種別 | 対応テストケース | 状態 |
|-----------|----------------|------|
| 正常系: 全仕様有効 | IT-UC-VerifyFallback-001 | カバー済み |
| 正常系: importチェックスキップ | IT-UC-VerifyFallback-002 | カバー済み |
| 正常系: targetFilePaths省略 | IT-UC-VerifyFallback-003 | カバー済み |
| 異常系: エージェントAPI検出 | IT-UC-VerifyFallback-004 | カバー済み |
| 異常系: 未登録コマンド | IT-UC-VerifyFallback-005 | カバー済み |
| 異常系: supportedCommands空 | IT-UC-VerifyFallback-006 | カバー済み |

**UseCase完全カバー（6/6）**

### 4.2 HandlePreToolUseUseCase（H11-02）

| シナリオ種別 | 対応テストケース | 状態 |
|-----------|----------------|------|
| 正常系: biome.jsonブロック | IT-UC-HandlePreToolUse-001 | カバー済み |
| 正常系: tsconfig.jsonブロック | IT-UC-HandlePreToolUse-002 | カバー済み |
| 正常系: 非保護ファイル通過 | IT-UC-HandlePreToolUse-003 | カバー済み |
| 正常系: カスタムパターン | IT-UC-HandlePreToolUse-004 | カバー済み |
| 正常系: 複数パスの1件一致 | IT-UC-HandlePreToolUse-005 | カバー済み |
| 異常系: toolName空文字 | IT-UC-HandlePreToolUse-006 | カバー済み |
| 境界値: targetFilePaths空配列 | IT-UC-HandlePreToolUse-007 | カバー済み |

**UseCase完全カバー（7/7）**

### 4.3 HandlePostToolUseUseCase（H11-03）

| シナリオ種別 | 対応テストケース | 状態 |
|-----------|----------------|------|
| 正常系: Hook有効・lint成功 | IT-UC-HandlePostToolUse-001 | カバー済み |
| 正常系: lint失敗（exitCode=1） | IT-UC-HandlePostToolUse-002 | カバー済み |
| 正常系: HOOK_DISABLED | IT-UC-HandlePostToolUse-003 | カバー済み |
| 異常系: タイムアウト超過 | IT-UC-HandlePostToolUse-004 | カバー済み |
| 異常系: CliExecutorPort実行エラー | IT-UC-HandlePostToolUse-005 | カバー済み |
| 境界値: affectedFilePaths空配列 | IT-UC-HandlePostToolUse-006 | カバー済み |

**UseCase完全カバー（6/6）**

### 4.4 HandleStopUseCase（H11-04）

| シナリオ種別 | 対応テストケース | 状態 |
|-----------|----------------|------|
| 正常系: complete-check実行（inactive） | IT-UC-HandleStop-001 | カバー済み |
| 正常系: deactivate確認（try/finally） | IT-UC-HandleStop-002 | カバー済み |
| 正常系: REENTRY_DETECTED | IT-UC-HandleStop-003 | カバー済み |
| 正常系: exitCode=1時のdeactivate保証 | IT-UC-HandleStop-004 | カバー済み |
| 異常系: CLI例外時のdeactivate保証 | IT-UC-HandleStop-005 | カバー済み |
| 異常系: sessionId空文字 | IT-UC-HandleStop-006 | カバー済み |
| 異常系: writeActive失敗 | IT-UC-HandleStop-007 | カバー済み |

**UseCase完全カバー（7/7）**

---

## 5. APIカバレッジ詳細

### 5.1 PreToolUse Hook Adapter（pre-tool-use-hook.ts）

| カテゴリ | テストケース | 状態 |
|---------|-----------|------|
| 入力バリデーション: biome.json → exit 2 | IT-API-PreToolUse-001 | カバー済み |
| 入力バリデーション: tsconfig.json → exit 2 | （IT-API-PreToolUse-001〜003の組み合わせ） | カバー済み |
| 入力バリデーション: package.json → exit 2 | IT-API-PreToolUse-003 | カバー済み |
| 正常系: 非保護ファイル → exit 0 | IT-API-PreToolUse-002、IT-API-PreToolUse-004 | カバー済み |
| 正常系: ブロックメッセージ出力 | IT-API-PreToolUse-005 | カバー済み |
| 異常系: 不正JSON → exit 2 | IT-API-PreToolUse-006 | カバー済み |
| 異常系: tool_nameなし → exit 2 | IT-API-PreToolUse-007 | カバー済み |

**7ケース全カバー**

### 5.2 PostToolUse Hook Adapter（post-tool-use-hook.ts）

| カテゴリ | テストケース | 状態 |
|---------|-----------|------|
| 入力バリデーション: 不正JSON → exit 2 | IT-API-PostToolUse-001 | カバー済み |
| 入力バリデーション: tool_nameなし → exit 2 | IT-API-PostToolUse-002 | カバー済み |
| 正常系: lint成功 → exit 0 | IT-API-PostToolUse-003 | カバー済み |
| 正常系: lint失敗 → exit 1 + stderr | IT-API-PostToolUse-004 | カバー済み |
| 正常系: HOOK_DISABLED → exit 0 + stderr | IT-API-PostToolUse-005 | カバー済み |
| 境界値: タイムアウト → exit 0（スキップ） | IT-API-PostToolUse-006 | カバー済み |
| 異常系: UseCase実行エラー → exit 2 | IT-API-PostToolUse-007 | カバー済み |

**7ケース全カバー**

### 5.3 Stop Hook Adapter（stop-hook.ts）

| カテゴリ | テストケース | 状態 |
|---------|-----------|------|
| 入力バリデーション: 不正JSON → exit 2 | IT-API-StopHook-001 | カバー済み |
| 入力バリデーション: session_idなし → exit 2 | IT-API-StopHook-002 | カバー済み |
| 正常系: complete-check成功 → exit 0 | IT-API-StopHook-003 | カバー済み |
| 正常系: complete-check失敗 → exit 1 | IT-API-StopHook-004 | カバー済み |
| 正常系: REENTRY_DETECTED → exit 0 + stderr | IT-API-StopHook-005 | カバー済み |
| 異常系: UseCase実行エラー → exit 2 | IT-API-StopHook-006 | カバー済み |
| 異常系: 予期しない例外 → exit 2 | IT-API-StopHook-007 | カバー済み |

**7ケース全カバー**

### 5.4 統合フロー（Hook Flow Integration）

| シナリオ | テストケース | 状態 |
|---------|-----------|------|
| Stop通常フロー（ReentryGuard実体使用） | IT-UC-HookFlow-001 | カバー済み |
| Stop再入フロー（REENTRY_DETECTED） | IT-UC-HookFlow-002 | カバー済み |
| PostToolUse正常フロー | IT-UC-HookFlow-003 | カバー済み |
| PreToolUse保護フロー | IT-UC-HookFlow-004 | カバー済み |
| CLI例外時のReentryGuardデアクティベート保証 | IT-UC-HookFlow-005 | カバー済み |

**5ケース全カバー**

---

## 6. Engineering Perspective 評価

### ケント・ベック視点: TDD適切性

**評価**: 良好（軽微な改善提案あり）

**強み:**

- テストケースの粒度は適切。各テストケースが単一の振る舞い（例: `activate() → isActive()=true`）を検証しており、Red-Green-Refactorサイクルの1ステップとして機能できる粒度になっている
- UT-RG-030（activate→deactivate→activateシーケンス）はシーケンス検証として意味があり、YAGNI違反にはあたらない
- 境界値ケース（UT-BV-*）がユニットテスト本体と別セクションにまとめられており、実装フェーズで重複を整理しやすい構造になっている

**改善提案:**

- `UT-RG-031`（activate→activate→HarnessError）は`UT-RG-020`と実質的に同義のテストケースである。コメント「UT-RG-020と同義、シーケンス視点」と記述されているが、実装時には1つのテストケースとして統合することを推奨する。YAGNIの観点から同一振る舞いを2つのテストケースで記述すると、メンテナンスコストが倍増する
- `UT-BV-*`セクションの14件は多くが本体テストケースとの重複である（例: UT-BV-001 = UT-PFL-010、UT-BV-007 = UT-RG-020）。実装フェーズで重複排除を行い、境界値セクションを境界値固有のケース（UT-BV-011, UT-BV-012, UT-BV-013等）のみに絞ることを推奨する

---

### マーティン・ファウラー視点: テスト設計スメル

**評価**: 良好（潜在的スメル2件）

**強み:**

- UseCase ITテスト（2.1〜2.4）は全てモックパターンが明示されており、Arrangeフェーズのセットアップが明確。「過剰セットアップ」のスメルはない
- Infrastructure Adapterテスト（3.1〜3.5）は前提条件（strategy: 'env'/'file'、フィクスチャ配置）が明確に分離されており、テスト間の独立性が保たれている
- `afterEach` によるクリーンアップ（`clearActive()`）が定義されており、テスト間の状態汚染を防ぐ設計になっている

**潜在的スメル:**

1. **テスト間の暗黙的依存（EnvFileReentryGuardStateAdapter）**: `IT-REPO-EnvFileAdapter-002`（writeActive→readActive）と`IT-REPO-EnvFileAdapter-003`（writeActive→clearActive→readActive）は操作シーケンスが類似しており、beforeEach/afterEachのクリーンアップが適切に機能しなかった場合に状態汚染が生じるリスクがある。実装時にbeforeEachで完全な環境リセット（環境変数削除 + tmpファイル削除）を徹底することを推奨する
2. **Presentation層テストのスコープ曖昧性**: `IT-API-*`ケースは「UseCase をモックし、stdin JSONシミュレーション」と記述されているが、`IT-API-PreToolUse-001`の期待結果が「exit code 2（ブロック）」となっており、UseCaseモックなしで実際のdomainロジックが動作することを前提にしているかのように読める。モック境界の明確化が必要（Presentation層テストはUseCaseをモックし、UseCaseの応答のみを検証すべき）

---

### アンクル・ボブ視点: SOLID・責務分離

**評価**: 優良

**SRP（単一責任原則）:**

- ユニットテストはDomainモデル（エンティティ・VO・ドメインサービス）のみを対象とし、インフラ・プレゼンテーション層のロジックは含んでいない。責務の分離が設計レベルで実現されている
- ITテストはUseCase/Adapter/Presentation/統合フローに分割されており、各ファイルが単一の責務を検証する構造になっている
- `HookToCliTranslator`のテスト（UT-HTC-*）はポートをモックし「変換ルールのみ」を検証している。CLI実行テストはAdapterテストに委譲されており、SRP遵守

**DIP（依存性逆転原則）:**

- ドメインサービスのテストはポート（ReentryGuardStatePort、ConfigQueryPort等）をモックしており、implementation detailに依存しない設計になっている
- `vi.fn()`によるモック生成パターンが共通化されており、Portインターフェースへの依存が明示的

**単一振る舞い検証:**

- 各テストケース（UT-RG-010〜014）は「activate()のみ」「deactivate()のみ」「isActive()のみ」という単一メソッド呼び出しを検証しており、単一振る舞いの原則に準拠している
- **改善提案**: `UT-HTR-030`（HookTranslationResult等値性）と`UT-HTR-031`（非等値性）については、等値性検証が実装上の価値を持つかどうかを検討する必要がある。TypeScriptのVO実装でdeep equalityを採用する場合、これらのテストケースは有効。ただし等値性テストを全VOに網羅的に追加するのは過剰になる可能性がある（YAGNI）

---

### エリック・エヴァンス視点: ドメイン表現

**評価**: 良好（改善提案2件）

**ユビキタス言語の使用:**

- テストケース名は英語識別子（UT-RG-010等）で定義されているが、テスト規約のコメント（§7）では「テストケース名は日本語」が求められており、実装時のit()記述が日本語になることが前提となっている。設計文書上の表形式での英語識別子は許容範囲
- `REENTRY_DETECTED`、`HOOK_DISABLED`、`TIMEOUT_EXCEEDED`というSkipReason列挙値は、ドメインのユビキタス言語（「再入検出」「フック無効」「タイムアウト超過」）を英語でそのまま表現しており適切

**ドメイン概念の正確な表現:**

- `ReentryGuard`のテストケース（UT-RG-*）は「無限ループ防止」というビジネスルールを正確に表現している。状態遷移テスト（activate/deactivate）がReentryGuardのライフサイクルを網羅しており、ドメイン概念として適切
- `ProtectedFileList`のテストケース（UT-PFL-*）はAC-5で定義された保護対象ファイル（biome.json等）を明示的にテストしており、D3（デフォルトパターンのドメインハードコード）の設計判断と整合している
- `FallbackCapabilitySpec`のテストケース（UT-FCS-*）はH11-01の「エージェント非依存性保証」という概念をVOとして正確に表現している

**ドメイン層とインフラ層の責務分離:**

- Hook統合テスト（IT-UC-HookFlow-*）において、EnvFileReentryGuardStateAdapterを実体として使用し、CliExecutorPortのみをモックする方針は、ドメインとインフラの境界を適切に表現している

**改善提案:**

1. **UT-HTC-003のシナリオ説明が不足**: 「targetFilePathsが複数あり、うち1件がprotected」というケースは`ProtectedFileList.matches()`のOR条件ルールを検証するドメイン上重要な仕様である。テストケースの前提条件説明（「どのファイルがマッチするか」）をより明示的に記述することを推奨する
2. **HandleStopUseCaseのdeactivate保証テスト（IT-UC-HandleStop-002）**: 「clearActiveが呼ばれた」という検証は実装の内側（Portメソッド呼び出し）を検証しており、ドメイン観点では「フラグがクリアされた」という状態で検証すべきである。「deactivate実行の確認」ではなく「Stop Hook完了後にReentryGuardがinactiveになっていること」をアサートする形に変更することを推奨する

---

### Engineering Perspective 総合判定

| 視点 | 判定 | 主な所見 |
|------|------|---------|
| ケント・ベック（TDD適切性） | PASS（軽微な改善） | UT-RG-031とUT-BV-*の重複排除を推奨 |
| マーティン・ファウラー（設計スメル） | PASS（要注意点あり） | Presentation層テストのモック境界明確化が必要 |
| アンクル・ボブ（SOLID） | PASS | SRP・DIPともに遵守。等値性テストの必要性を再確認 |
| エリック・エヴァンス（ドメイン表現） | PASS（改善推奨） | HandleStopUseCaseのデアクティベート検証をドメイン表現に統一 |

**総合判定: PASS（実装可能）。改善提案はすべて実装フェーズで対応可能な軽微な事項であり、現設計でのブロック要因はない。**

---

## 7. 未カバー項目一覧（優先度付き）

| 優先度 | 未カバー項目 | 理由 | 対応方針 |
|--------|-----------|------|---------|
| High | AC-6: ブロック時のHarnessErrorにファイル名が含まれること（明示的アサーション） | IT-API-PreToolUse-005でメッセージ出力は検証しているが、HarnessError型のフィールド（message/code等）にファイル名が含まれることを直接アサートするケースがない | HandlePreToolUseUseCase ITテストに「ブロック結果のHarnessError.messageにファイル名が含まれること」を検証するケースを1件追加する |
| Medium | HandleStopUseCaseのdeactivate状態検証（ドメイン表現） | IT-UC-HandleStop-002が「clearActiveが呼ばれた」という内部メソッド確認になっている | 「Stop Hook完了後にReentryGuard.isActive()=falseになっていること」に変更 |
| Low | UT-RG-031とUT-BV-007の重複排除 | UT-RG-031はUT-RG-020と同義のテストケース | 実装フェーズで統合。設計変更は不要 |
| Low | UT-BV-*セクションの冗長性 | 多くがdomainモデルテストと重複 | 実装フェーズで境界値固有ケースのみ残す（UT-BV-011, UT-BV-012, UT-BV-013は固有） |
| Low | HarnessConfigConfigQueryAdapter Wave 2暫定マッピングの将来対応 | `cascadeUpdate`→PostToolUse、`agentLessonCollection`→PreToolUseのマッピングが暫定 | Wave 3でhooksサブセクション追加後にAdapterのみ差し替え。テスト変更不要 |

---

## 8. 推奨追加ケース

### 高優先度

**[追加推奨-001] HandlePreToolUseUseCase: ブロック時のHarnessError内容検証**

```
ケースID: IT-UC-HandlePreToolUse-008
シナリオ: biome.jsonへの変更をブロックした際、結果にファイル名を含むHarnessErrorが含まれること
入力: { toolName: 'str_replace_editor', targetFilePaths: ['biome.json'] }
モック: ConfigQueryPort: getProtectedFilePatterns=[]
期待結果: result.error.message に 'biome.json' が含まれる、またはHarnessError.codeが設定されている
```

### 中優先度

**[追加推奨-002] HandleStopUseCase: deactivateドメイン状態検証**

```
ケースID: IT-UC-HandleStop-008
シナリオ: Stop Hook完了後、ReentryGuardがinactive状態に戻ること（ドメイン状態でアサート）
入力: { sessionId: 'session-008' }
モック: ReentryGuardStatePort: readActive=false→writeActive成功→clearActive成功（実体使用も検討）
期待結果: HandleStopUseCase実行後にreentryGuard.isActive()=falseであること
```

### 低優先度（実装フェーズで統合）

**[追加推奨-003] UT-RG-031削除・UT-BV-007との統合**

UT-RG-031はUT-RG-020と同義のため、実装フェーズではUT-RG-020のみ実装する。UT-BV-007も同様に削除する。

---

## 9. 次のアクション

| アクション | 担当スキル | 優先度 |
|-----------|---------|--------|
| HandlePreToolUseUseCase: HarnessErrorファイル名検証ケース追加（追加推奨-001） | story-implementor（H11-02実装時に組み込み） | High |
| HandleStopUseCase: deactivate状態検証の改善（追加推奨-002） | story-implementor（H11-04実装時に改善） | Medium |
| unit_test_design.mdの重複ケース整理（UT-RG-031、UT-BV重複分） | 設計更新は不要（実装時に対応） | Low |
| unit-test-logic-designer: 各テストケースの疑似コード設計 | unit-test-logic-designer | High（次フェーズ） |
| story-implementor: TDD実装（H11-01から順次） | story-implementor | High（実装フェーズ） |
