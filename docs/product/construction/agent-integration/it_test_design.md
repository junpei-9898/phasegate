# ITテスト設計: agent-integration

@story-id H11-01
@story-id H11-02
@story-id H11-03
@story-id H11-04
@work-item-id WI-097
@work-item-id WI-209
> **Unit ID**: agent-integration
> **作成日**: 2026-03-19
> **対応ストーリー**: H11-01, H11-02, H11-03, H11-04
> **対応Issue**: ISSUE-001
> **参照文書**:
> - `docs/product/construction/agent-integration/logical_design.md`
> - `docs/product/construction/agent-integration/domain_model.md`
> - `docs/product/units/integration_contract.md`
> - `docs/principles/testing-rules.md`

---

## 1. 対象コンポーネント

- **UseCase**: VerifyFallbackCapabilityUseCase, HandlePreToolUseUseCase, HandlePostToolUseUseCase, HandleStopUseCase
- **Infrastructure Adapter**: EnvFileReentryGuardStateAdapter, HarnessConfigConfigQueryAdapter, HarnessApiCliCommandRegistryAdapter, TsMorphImportAnalyzerAdapter, ChildProcessCliExecutorAdapter
- **Presentation Hook Adapter**: pre-tool-use-hook.ts, post-tool-use-hook.ts, stop-hook.ts
- **統合フロー**: Hook Flow Integration（UseCase + Adapter結合）

WI-209 dogfooding validates that installed personal and project/team agent runtime surfaces can execute `session-start`, `user-prompt-submit`, and `pre-tool-use` through the packaged CLI contract. The agent-integration regression target is the spawned CLI helper behavior: child processes must settle or be killed on timeout, and `pre-tool-use` must block protected-file writes after install-created config discovery succeeds.

---

## 2. UseCaseテストケース

### 2.1 VerifyFallbackCapabilityUseCase（H11-01対応）

**テスト方針**: Domainモデル（FallbackCapabilitySpec, FallbackVerificationService）は実体を使用。ImportAnalyzerPortとCliCommandRegistryPortをモックとする。

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-VerifyFallback-001 | フォールバック仕様が全て有効な場合、検証が成功すること | `{ supportedCommands: ['phasegate:lint', 'phasegate:complete-check'], noAgentApiImports: true, targetFilePaths: ['src/index.ts'] }` | ImportAnalyzerPort: agentApiImports=[]を返す。CliCommandRegistryPort: hasCommand=trueを返す | `{ isValid: true, violations: [], spec: FallbackCapabilitySpec }` |
| IT-UC-VerifyFallback-002 | noAgentApiImports=falseの場合、ImportAnalyzer解析をスキップして成功すること | `{ supportedCommands: ['phasegate:lint'], noAgentApiImports: false }` | CliCommandRegistryPort: hasCommand=trueを返す。ImportAnalyzerPortは呼ばれない | `{ isValid: true, violations: [] }` |
| IT-UC-VerifyFallback-003 | targetFilePathsが未指定の場合、デフォルトのコアモジュールパスで検証が成功すること | `{ supportedCommands: ['phasegate:lint'], noAgentApiImports: true }` （targetFilePaths省略） | ImportAnalyzerPort: agentApiImports=[]を返す。CliCommandRegistryPort: hasCommand=true | `{ isValid: true, violations: [] }` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-VerifyFallback-004 | エージェント固有APIのimportが検出された場合、violations付きで失敗すること | `{ supportedCommands: ['phasegate:lint'], noAgentApiImports: true, targetFilePaths: ['src/agent.ts'] }` | ImportAnalyzerPort: `[{ filePath: 'src/agent.ts', agentApiImports: ['@anthropic-ai/claude-code'] }]`を返す | `{ isValid: false, violations: [HarnessError(code含む)] }` |
| IT-UC-VerifyFallback-005 | 未登録コマンドが指定された場合、violations付きで失敗すること | `{ supportedCommands: ['phasegate:lint', 'harness:unknown-cmd'], noAgentApiImports: false }` | CliCommandRegistryPort: phasegate:lintはtrue、harness:unknown-cmdはfalse | `{ isValid: false, violations: [HarnessError] }` |
| IT-UC-VerifyFallback-006 | supportedCommandsが空の場合、FallbackCapabilityViolationErrorがスローされること | `{ supportedCommands: [], noAgentApiImports: false }` | — | `FallbackCapabilityViolationError` のthrow |

### 2.2 HandlePreToolUseUseCase（H11-02対応）

**テスト方針**: Domainモデル（HookEvent, ProtectedFileList, HookToCliTranslator）は実体を使用。ConfigQueryPortをモックとする。

<!-- @work-item-id WI-015 -->
`HandlePreToolUseUseCase` は full-mode 判定時に `targetFilePaths` だけでなく、取得できた `beforeContent` / `afterContent` を持つ `targetChanges` を FullModeRequirementQueryPort に渡す。Edit/Write hook の diff 情報が quick-mode に届くことを integration test で検証する。

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-HandlePreToolUse-001 | 保護対象ファイル（biome.json）への変更がブロックされること | `{ toolName: 'str_replace_editor', targetFilePaths: ['biome.json'] }` | ConfigQueryPort: getProtectedFilePatterns=[]を返す | `{ shouldBlock: true, blockedFilePath: 'biome.json' }` |
| IT-UC-HandlePreToolUse-002 | 保護対象ファイル（tsconfig.json）への変更がブロックされること | `{ toolName: 'str_replace_editor', targetFilePaths: ['tsconfig.json'] }` | ConfigQueryPort: getProtectedFilePatterns=[]を返す | `{ shouldBlock: true, blockedFilePath: 'tsconfig.json' }` |
| IT-UC-HandlePreToolUse-003 | 保護対象外ファイルへの変更は通過すること | `{ toolName: 'str_replace_editor', targetFilePaths: ['src/index.ts'] }` | ConfigQueryPort: getProtectedFilePatterns=[]を返す | `{ shouldBlock: false, blockedFilePath: undefined }` |
| IT-UC-HandlePreToolUse-004 | カスタム追加パターンに一致するファイルがブロックされること | `{ toolName: 'str_replace_editor', targetFilePaths: ['custom-protected.json'] }` | ConfigQueryPort: getProtectedFilePatterns=['custom-protected.json']を返す | `{ shouldBlock: true, blockedFilePath: 'custom-protected.json' }` |
| IT-UC-HandlePreToolUse-005 | 複数パスのうち1件でも保護対象に一致すればブロックされること | `{ toolName: 'str_replace_editor', targetFilePaths: ['src/index.ts', 'package.json'] }` | ConfigQueryPort: getProtectedFilePatterns=[]を返す | `{ shouldBlock: true, blockedFilePath: 'package.json' }` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-HandlePreToolUse-006 | toolNameが空文字の場合、入力バリデーションエラーになること | `{ toolName: '', targetFilePaths: ['src/index.ts'] }` | — | バリデーションエラー（HarnessError または例外） |
| IT-UC-HandlePreToolUse-007 | targetFilePathsが空配列の場合、ブロックなしで通過すること | `{ toolName: 'str_replace_editor', targetFilePaths: [] }` | ConfigQueryPort: getProtectedFilePatterns=[]を返す | `{ shouldBlock: false }` |
| IT-UC-HandlePreToolUse-008 | biome.jsonブロック時、result.error.messageにブロックされたファイル名（biome.json）が含まれること | `{ toolName: 'str_replace_editor', targetFilePaths: ['biome.json'] }` | ConfigQueryPort: getProtectedFilePatterns=[]を返す | `result.shouldBlock=true` かつ HarnessErrorの`message`または`details`に `"biome.json"` が含まれること |
| WI015-IT-001 | Edit hook 由来のコメントのみ API パス変更 | `{ toolName: 'Edit', targetFilePaths: ['.../some-port.ts'], targetChanges: [{ beforeContent, afterContent }] }` | FullModeRequirementQueryPort: targetChanges を受け取り `requiresFullMode=false` を返す | `shouldBlock=false` かつ Quick Mode 許可情報が返ること |

`HandlePreToolUseUseCase` は full-mode-required 判定で product design-doc bypass が成立しない場合でも、`FullModeSessionQueryPort` が active/allowed を返せば `FULL_MODE_REQUIRED` を返さず通過させる。session は `unit`, `dominantCategory`, TTL を検証し、不一致または期限切れなら従来通り block する。@work-item-id WI-206

| ID | 条件 | 入力 | Mock | 期待 |
|----|------|------|------|------|
| WI206-IT-001 | full-mode session が対象 unit/category を許可 | `scripts/harness/some-unit/domain/new-entity.ts` | FullModeRequirement: `requiresFullMode=true, dominantCategory=domain`; DesignDocs: false; FullModeSession: allowed | `shouldBlock=false`, `fullModeSessionAllowed` あり |
| WI206-IT-002 | session が期限切れまたは不一致 | 同上 | FullModeSession: `allowed=false` | `FULL_MODE_REQUIRED` block |
| WI206-IT-003 | CLI begin/end | `phasegate session begin ...`, `phasegate session end ...` | 実FS | `.phasegate/session.json` が作成・削除される |

### 2.3 HandlePostToolUseUseCase（H11-03対応）

**テスト方針**: Domainモデル実体を使用。ConfigQueryPortとCliExecutorPortをモックとする。

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-HandlePostToolUse-001 | PostToolUse Hookが有効な場合、phasegate:lint --fastが実行されること | `{ toolName: 'str_replace_editor', affectedFilePaths: ['src/index.ts'] }` | ConfigQueryPort: isHookEnabled=true。CliExecutorPort: exitCode=0を返す | `{ executed: true, skipReason: undefined, cliResult: { exitCode: 0 } }` |
| IT-UC-HandlePostToolUse-002 | Lintが失敗した場合（exitCode=1）、executed=trueでcliResult.exitCode=1が返ること | `{ toolName: 'str_replace_editor', affectedFilePaths: ['src/bad.ts'] }` | ConfigQueryPort: isHookEnabled=true。CliExecutorPort: exitCode=1を返す | `{ executed: true, cliResult: { exitCode: 1 } }` |
| IT-UC-HandlePostToolUse-003 | Hook無効設定の場合、HOOK_DISABLEDでスキップされること | `{ toolName: 'str_replace_editor', affectedFilePaths: ['src/index.ts'] }` | ConfigQueryPort: isHookEnabled('post-tool-use')=false | `{ executed: false, skipReason: 'HOOK_DISABLED' }` |

#### 異常系・境界値

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-HandlePostToolUse-004 | タイムアウト超過（500ms以上）の場合、TIMEOUT_EXCEEDEDでスキップされること | `{ toolName: 'str_replace_editor', affectedFilePaths: ['src/index.ts'] }` | ConfigQueryPort: isHookEnabled=true。CliExecutorPort: 500ms超過でTimeoutErrorをthrow | `{ executed: false, skipReason: 'TIMEOUT_EXCEEDED' }` |
| IT-UC-HandlePostToolUse-005 | CliExecutorPortが実行エラーをthrowした場合、例外が伝播すること | `{ toolName: 'str_replace_editor', affectedFilePaths: ['src/index.ts'] }` | ConfigQueryPort: isHookEnabled=true。CliExecutorPort: Errorをthrow | エラーが上位に伝播 |
| IT-UC-HandlePostToolUse-006 | affectedFilePathsが空配列の場合、Hookが正常に実行されること | `{ toolName: 'str_replace_editor', affectedFilePaths: [] }` | ConfigQueryPort: isHookEnabled=true。CliExecutorPort: exitCode=0 | `{ executed: true }` |

### 2.4 HandleStopUseCase（H11-04対応）

**テスト方針**: Domainモデル（ReentryGuard, HookToCliTranslator）は実体を使用。ReentryGuardStatePortとCliExecutorPortをモックとする。ReentryGuardのライフサイクル（activate/deactivate）管理を重点的に検証する。

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-HandleStop-001 | ReentryGuardが非アクティブな場合、phasegate:complete-checkが実行されること | `{ sessionId: 'session-001' }` | ReentryGuardStatePort: readActive=falseを返す。writeActive/clearActiveは成功。CliExecutorPort: exitCode=0を返す | `{ executed: true, skipReason: undefined, cliResult: { exitCode: 0 } }` |
| IT-UC-HandleStop-002 | complete-check成功後にdeactivateが呼ばれること（フラグがクリアされること） | `{ sessionId: 'session-002' }` | ReentryGuardStatePort: readActive=false。writeActive/clearActive成功。CliExecutorPort: exitCode=0を返す | clearActiveが呼ばれた（deactivate実行の確認） |
| IT-UC-HandleStop-003 | ReentryGuardがアクティブな場合（再入）、REENTRY_DETECTEDでスキップされること | `{ sessionId: 'session-003' }` | ReentryGuardStatePort: readActive=trueを返す | `{ executed: false, skipReason: 'REENTRY_DETECTED' }` |
| IT-UC-HandleStop-004 | complete-checkがFail（exitCode=1）でも、deactivateが必ず呼ばれること（try/finally保証） | `{ sessionId: 'session-004' }` | ReentryGuardStatePort: readActive=false。CliExecutorPort: exitCode=1を返す | `{ executed: true, cliResult: { exitCode: 1 } }`かつclearActiveが呼ばれた |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待エラー |
|---------|---------|------|----------|----------|
| IT-UC-HandleStop-005 | CLI実行中に例外が発生した場合でも、deactivateが必ず呼ばれること（finally保証） | `{ sessionId: 'session-005' }` | ReentryGuardStatePort: readActive=false。CliExecutorPort: Errorをthrow | エラーが伝播しつつ、clearActiveが呼ばれた |
| IT-UC-HandleStop-006 | sessionIdが空文字の場合、バリデーションエラーになること | `{ sessionId: '' }` | — | バリデーションエラー |
| IT-UC-HandleStop-007 | writeActive（activate）が失敗した場合、エラーが伝播してdeactivateは呼ばれないこと | `{ sessionId: 'session-007' }` | ReentryGuardStatePort: readActive=false、writeActiveがErrorをthrow | Errorが伝播。clearActiveは呼ばれない |

---

## 3. Infrastructure Adapterテストケース（Repository相当）

### 3.1 EnvFileReentryGuardStateAdapter

**前提**: 各テスト後に環境変数とtmpファイルをクリーンアップする。

#### env戦略テスト（strategy: 'env'）

| ケースID | 操作 | 入力/事前状態 | 期待結果 |
|---------|------|-------------|---------|
| IT-REPO-EnvFileAdapter-001 | readActive（未設定状態） | 環境変数 `HARNESS_STOP_HOOK_ACTIVE` が未設定 | `false` が返る |
| IT-REPO-EnvFileAdapter-002 | writeActive → readActive | writeActiveを実行 | readActiveが `true` を返す |
| IT-REPO-EnvFileAdapter-003 | writeActive → clearActive → readActive | writeActive後にclearActive | readActiveが `false` を返す |
| IT-REPO-EnvFileAdapter-004 | clearActive（未設定状態での冪等性） | 環境変数未設定でclearActiveを呼ぶ | エラーなく完了し、readActiveが `false` を返す |

#### file戦略テスト（strategy: 'file'）

| ケースID | 操作 | 入力/事前状態 | 期待結果 |
|---------|------|-------------|---------|
| IT-REPO-EnvFileAdapter-005 | readActive（tmpファイルなし） | tmpファイルが存在しない | `false` が返る |
| IT-REPO-EnvFileAdapter-006 | writeActive → readActive | writeActiveを実行 | tmpファイルが作成され、readActiveが `true` を返す |
| IT-REPO-EnvFileAdapter-007 | writeActive → clearActive → readActive | writeActive後にclearActive | tmpファイルが削除され、readActiveが `false` を返す |
| IT-REPO-EnvFileAdapter-008 | clearActive（ファイルなし状態での冪等性） | tmpファイルが存在しない状態でclearActive | エラーなく完了 |

#### エラーハンドリング

| ケースID | 操作 | 事前状態 | 期待結果 |
|---------|------|---------|---------|
| IT-REPO-EnvFileAdapter-009 | readActive（I/Oエラー時） | tmpファイルの親ディレクトリが存在しない（file戦略） | `false` が返る（安全側に倒す） |
| IT-REPO-EnvFileAdapter-010 | writeActive（I/Oエラー時） | 書き込み権限のないパス（file戦略） | エラーがthrowされる |

### 3.2 HarnessConfigConfigQueryAdapter

**前提**: fixtureの `phasegate.config.json` を使用する。

#### CRUDテスト（設定読み取り）

| ケースID | 操作 | 入力/事前データ | 期待結果 |
|---------|------|---------------|---------|
| IT-REPO-ConfigQueryAdapter-001 | isHookEnabled('post-tool-use')（cascadeUpdate=true） | HarnessConfigV2の `harnesses.cascadeUpdate: true` を持つfixture | `true` が返る |
| IT-REPO-ConfigQueryAdapter-002 | isHookEnabled('post-tool-use')（cascadeUpdate=false） | HarnessConfigV2の `harnesses.cascadeUpdate: false` を持つfixture | `false` が返る |
| IT-REPO-ConfigQueryAdapter-003 | isHookEnabled('pre-tool-use')（agentLessonCollection=true） | HarnessConfigV2の `harnesses.agentLessonCollection: true` を持つfixture | `true` が返る |
| IT-REPO-ConfigQueryAdapter-004 | getProtectedFilePatterns()（Wave 2暫定実装） | 任意のfixture | 空配列 `[]` が返る（Wave 2では追加パターンなし） |
| IT-REPO-ConfigQueryAdapter-005 | isHookEnabled('stop')（Stopはデフォルト有効） | 任意のfixture | `true` が返る |

#### エラーハンドリング

| ケースID | 操作 | 事前状態 | 期待結果 |
|---------|------|---------|---------|
| IT-REPO-ConfigQueryAdapter-006 | phasegate.config.jsonが存在しない場合 | configファイルなし | エラーがthrowされる（または安全なデフォルト値が返る） |

### 3.3 HarnessApiCliCommandRegistryAdapter

#### CRUDテスト（コマンド存在確認）

| ケースID | 操作 | 入力 | 期待結果 |
|---------|------|------|---------|
| IT-REPO-CliCommandRegistry-001 | hasCommand（登録済みコマンド） | `'phasegate:lint'` | `true` が返る |
| IT-REPO-CliCommandRegistry-002 | hasCommand（登録済みコマンド） | `'phasegate:complete-check'` | `true` が返る |
| IT-REPO-CliCommandRegistry-003 | hasCommand（未登録コマンド） | `'harness:unknown-command'` | `false` が返る |
| IT-REPO-CliCommandRegistry-004 | listCommands（全コマンド一覧） | — | `integration_contract.md §3.1` に定義された10コマンドが返る |

### 3.4 TsMorphImportAnalyzerAdapter

**前提**: テスト用フィクスチャファイルを `__tests__/integration/agent-integration/fixtures/` 配下に配置する。

#### CRUDテスト（Import解析）

| ケースID | 操作 | 入力/フィクスチャ | 期待結果 |
|---------|------|----------------|---------|
| IT-REPO-ImportAnalyzer-001 | analyzeAgentApiImports（エージェント固有APIなし） | `import { readFile } from 'node:fs/promises'` のみのフィクスチャファイル | `[{ filePath: '...', agentApiImports: [] }]` |
| IT-REPO-ImportAnalyzer-002 | analyzeAgentApiImports（エージェント固有APIあり） | `import { query } from '@anthropic-ai/claude-code'` を含むフィクスチャファイル | `[{ filePath: '...', agentApiImports: ['@anthropic-ai/claude-code'] }]` |
| IT-REPO-ImportAnalyzer-003 | analyzeAgentApiImports（複数ファイル） | エージェントAPI有り・なし各1ファイル | 2件のImportAnalysisResultが返る（うち1件がagentApiImports非空） |
| IT-REPO-ImportAnalyzer-004 | analyzeAgentApiImports（空パスリスト） | `targetFilePaths: []` | 空配列 `[]` が返る |

#### エラーハンドリング

| ケースID | 操作 | 事前状態 | 期待結果 |
|---------|------|---------|---------|
| IT-REPO-ImportAnalyzer-005 | analyzeAgentApiImports（存在しないファイルパス） | 存在しないパスを指定 | エラーがthrowされる（またはagentApiImports=[]として無視） |

### 3.5 ChildProcessCliExecutorAdapter

**前提**: 実際のCLIは起動しない。モック用スクリプト（exit codeのみを返す）を使用する。

#### CRUDテスト（CLI実行）

| ケースID | 操作 | 入力 | 期待結果 |
|---------|------|------|---------|
| IT-REPO-CliExecutor-001 | execute（exitCode=0で正常終了） | command='phasegate:lint', args=['--fast'], timeoutMs=500 | `{ exitCode: 0, timedOut: false }` |
| IT-REPO-CliExecutor-002 | execute（exitCode=1でLint失敗） | command='phasegate:lint', args=['--fast'] | `{ exitCode: 1, timedOut: false }` |
| IT-REPO-CliExecutor-003 | execute（stdout/stderrが取得できること） | command='phasegate:status', args=[] | `{ stdout: '...', stderr: '...', timedOut: false }` |

#### タイムアウトテスト

| ケースID | シナリオ | 期待結果 |
|---------|---------|---------|
| IT-REPO-CliExecutor-004 | timeoutMs以内に完了する場合、timedOut=falseが返ること | `{ timedOut: false }` |
| IT-REPO-CliExecutor-005 | timeoutMsを超過した場合、TimeoutErrorがthrowされること（timedOut=true） | TimeoutErrorのthrowまたは `{ timedOut: true }` |

---

## 4. Presentation Hook Adapterテストケース（Controller/API相当）

**テスト方針**: UseCaseをモックし、stdin JSONシミュレーションとexit code検証に集中する。
Presentation層のテストは子プロセス（spawnまたはexecFile）経由でスクリプトを実行し、exit codeを検証する。

### 4.1 pre-tool-use-hook.ts

#### バリデーションテスト（入力JSON）

| ケースID | 入力（stdin JSON） | 期待レスポンス（exit code） |
|---------|-----------------|--------------------------|
| IT-API-PreToolUse-001 | `{ "tool_name": "str_replace_editor", "tool_input": { "path": "biome.json" } }` | exit code 2（ブロック） |
| IT-API-PreToolUse-002 | `{ "tool_name": "str_replace_editor", "tool_input": { "path": "src/index.ts" } }` | exit code 0（通過） |
| IT-API-PreToolUse-003 | `{ "tool_name": "str_replace_editor", "tool_input": { "path": "package.json" } }` | exit code 2（ブロック） |

#### 認証・認可テスト

（認証認可機構なし。該当なし）

#### 正常系

| ケースID | 入力（stdin JSON） | 期待レスポンス |
|---------|-----------------|--------------|
| IT-API-PreToolUse-004 | 保護対象外ファイルへのアクセス | exit code 0、stderrなし |
| IT-API-PreToolUse-005 | 保護対象ファイルへのアクセス | exit code 2、stderrにブロックメッセージあり |

#### 異常系

| ケースID | 入力（stdin JSON） | 期待エラー（exit code） |
|---------|-----------------|----------------------|
| IT-API-PreToolUse-006 | 不正なJSON（`{ invalid json` ） | exit code 2（実行エラー）、stderrにエラーメッセージ |
| IT-API-PreToolUse-007 | tool_nameフィールドなし（`{ "tool_input": {} }`） | exit code 2（実行エラー） |

### 4.2 post-tool-use-hook.ts

#### バリデーションテスト（入力JSON）

| ケースID | 入力（stdin JSON） | 期待エラー |
|---------|-----------------|----------|
| IT-API-PostToolUse-001 | 不正なJSON | exit code 2、stderrにエラーメッセージ |
| IT-API-PostToolUse-002 | tool_nameフィールドなし | exit code 2 |

#### 正常系

| ケースID | 入力（stdin JSON） | 期待レスポンス |
|---------|-----------------|--------------|
| IT-API-PostToolUse-003 | `{ "tool_name": "str_replace_editor", "tool_response": {} }` | UseCase: `executed=true, exitCode=0` → exit code 0 |
| IT-API-PostToolUse-004 | Lint失敗（exitCode=1）のシナリオ | UseCase: `executed=true, cliResult.exitCode=1` → exit code 1、stderrにLint失敗メッセージ |
| IT-API-PostToolUse-005 | スキップ（HOOK_DISABLED）のシナリオ | UseCase: `executed=false, skipReason='HOOK_DISABLED'` → exit code 0、stderrにスキップ理由 |

#### 境界値テスト

| ケースID | 入力 | 期待エラー |
|---------|------|----------|
| IT-API-PostToolUse-006 | タイムアウト超過シナリオ | UseCase: `executed=false, skipReason='TIMEOUT_EXCEEDED'` → exit code 0（スキップ扱い） |
| IT-API-PostToolUse-007 | UseCase実行エラー | exit code 2、stderrに診断情報 |

### 4.3 stop-hook.ts

#### バリデーションテスト（入力JSON）

| ケースID | 入力（stdin JSON） | 期待エラー |
|---------|-----------------|----------|
| IT-API-StopHook-001 | 不正なJSON | exit code 2、stderrにエラーメッセージ |
| IT-API-StopHook-002 | session_idフィールドなし（`{}`） | exit code 2 |

#### 正常系

| ケースID | 入力（stdin JSON） | 期待レスポンス |
|---------|-----------------|--------------|
| IT-API-StopHook-003 | `{ "session_id": "abc123" }` | UseCase: `executed=true, exitCode=0` → exit code 0 |
| IT-API-StopHook-004 | complete-check失敗（exitCode=1）のシナリオ | UseCase: `executed=true, cliResult.exitCode=1` → exit code 1、stderrにCheck失敗メッセージ |
| IT-API-StopHook-005 | REENTRY_DETECTED（再入検出）のシナリオ | UseCase: `executed=false, skipReason='REENTRY_DETECTED'` → exit code 0、stderrに再入検出メッセージ |

#### 異常系

| ケースID | 入力 | 期待エラー |
|---------|------|----------|
| IT-API-StopHook-006 | UseCase実行エラー | exit code 2、stderrに診断情報 |
| IT-API-StopHook-007 | UseCase実行中に予期しない例外が発生した場合 | exit code 2（実行エラー）で安全に終了 |

---

## 5. 統合フローテストケース（Hook Flow Integration）

**テスト方針**: EnvFileReentryGuardStateAdapter（実ファイルシステム）とDomainモデルを実体として使用。CliExecutorPortのみモック。
テストファイル: `scripts/harness/__tests__/integration/agent-integration/codex-payload-compatibility.integration.test.ts`

| ケースID | シナリオ | 事前状態 | テスト操作 | 期待結果 |
|---------|---------|---------|-----------|---------|
| IT-UC-HookFlow-001 | Stop Hook通常フロー：ReentryGuard inactive → activate → complete-check実行 → deactivate | フラグ未設定 | HandleStopUseCase.execute（ReentryGuardStatePort=実体、CliExecutorPort=モック） | executed=true、フラグが最終的にクリアされている |
| IT-UC-HookFlow-002 | Stop Hook再入フロー：ReentryGuard active → REENTRY_DETECTED | フラグ設定済み（writeActiveで事前セット） | HandleStopUseCase.execute | `{ executed: false, skipReason: 'REENTRY_DETECTED' }`、フラグ状態は変化しない |
| IT-UC-HookFlow-003 | PostToolUse Hook正常フロー：Hook有効 → phasegate:lint --fast実行 | ConfigQueryPort=モック（enabled=true） | HandlePostToolUseUseCase.execute（CliExecutorPort=モック） | executed=trueかつcliCommandが正しく渡される |
| IT-UC-HookFlow-004 | PreToolUse Hook保護フロー：biome.json変更 → ブロック | ConfigQueryPort=モック（追加パターンなし） | HandlePreToolUseUseCase.execute | `{ shouldBlock: true, blockedFilePath: 'biome.json' }` |
| IT-UC-HookFlow-005 | CLI実行エラー時のReentryGuardデアクティベート保証 | フラグ未設定 | HandleStopUseCase.execute（CliExecutorPort: Errorをthrow） | エラー伝播しつつ、フラグが最終的にクリアされている（finally保証） |

---

## 6. シードデータ要件

| データセット | 用途 | 内容 |
|------------|------|------|
| `fixtures/harness-config-enabled.json` | ConfigQueryAdapter ITテスト（Hook有効設定） | `harnesses: { cascadeUpdate: true, agentLessonCollection: true }` を含む最小HarnessConfigV2 |
| `fixtures/harness-config-disabled.json` | ConfigQueryAdapter ITテスト（Hook無効設定） | `harnesses: { cascadeUpdate: false, agentLessonCollection: false }` を含む最小HarnessConfigV2 |
| `fixtures/no-agent-api.ts` | TsMorphImportAnalyzerAdapter ITテスト（エージェントAPIなし） | `import { readFile } from 'node:fs/promises'` のみを含むTypeScriptファイル |
| `fixtures/with-agent-api.ts` | TsMorphImportAnalyzerAdapter ITテスト（エージェントAPIあり） | `import { query } from '@anthropic-ai/claude-code'` を含むTypeScriptファイル |
| `fixtures/mock-cli-exit-0.ts` | ChildProcessCliExecutorAdapter ITテスト（成功） | `process.exit(0)` のみのモックCLIスクリプト |
| `fixtures/mock-cli-exit-1.ts` | ChildProcessCliExecutorAdapter ITテスト（Lint失敗） | `process.exit(1)` のみのモックCLIスクリプト |
| `fixtures/mock-cli-slow.ts` | ChildProcessCliExecutorAdapter タイムアウトテスト | 1000ms待機後に `process.exit(0)` するモックCLIスクリプト |

**フィクスチャ配置先**: `scripts/harness/__tests__/integration/agent-integration/fixtures/`

---

## 7. テスト環境設定

### ファイル配置

```
scripts/harness/__tests__/integration/agent-integration/
├── fixtures/
│   ├── harness-config-enabled.json
│   ├── harness-config-disabled.json
│   ├── no-agent-api.ts
│   ├── with-agent-api.ts
│   ├── mock-cli-exit-0.ts
│   ├── mock-cli-exit-1.ts
│   └── mock-cli-slow.ts
├── env-file-reentry-guard-state-adapter.test.ts
├── harness-config-config-query-adapter.test.ts
├── handle-pre-tool-use-usecase.test.ts
├── handle-post-tool-use-usecase.test.ts
├── handle-stop-usecase.test.ts
└── codex-payload-compatibility.integration.test.ts
```

### テストメタデータ（testing-rules.md準拠）

各テストファイルには以下のメタデータコメントを記述する:

```typescript
// @unit agent-integration
// @layer infrastructure  (またはapplication/presentation)
// @story H11-01           (対応ストーリー)
```

### モック設定（UseCase ITテスト共通）

各UseCaseテストのArrangeにて:

```typescript
// Port モック生成パターン（vi.fn()使用）
const mockReentryGuardStatePort = {
  readActive: vi.fn(),
  writeActive: vi.fn(),
  clearActive: vi.fn(),
};
const mockCliExecutorPort = {
  execute: vi.fn(),
};
const mockConfigQueryPort = {
  isHookEnabled: vi.fn(),
  getProtectedFilePatterns: vi.fn(),
};
const mockImportAnalyzerPort = {
  analyzeAgentApiImports: vi.fn(),
};
const mockCliCommandRegistryPort = {
  hasCommand: vi.fn(),
  listCommands: vi.fn(),
};
```

### Adapter統合テスト設定

```typescript
// EnvFileReentryGuardStateAdapter テストセットアップ
beforeEach(async () => {
  // 環境変数クリーンアップ
  delete process.env.HARNESS_STOP_HOOK_ACTIVE;
  // tmpファイルクリーンアップは clearActive() で実施
});

afterEach(async () => {
  // テスト後のクリーンアップ（冪等なclearActiveを使用）
  const adapter = new EnvFileReentryGuardStateAdapter({ strategy: 'env' });
  await adapter.clearActive();
});
```

### テスト規約（testing-rules.md準拠）

- テストケース名は全て日本語で記述する
- AAAパターン（Arrange-Act-Assert）でコメントを明示する
- Act結果は `actual` 変数へ代入する
- describe構造: `target(対象メソッド名) → describe(振る舞い) → context(前提条件) → it(期待値)`
- テスト用ファイル名はkebab-caseとする

### テストフレームワーク・ツール

| 種別 | 内容 |
|------|------|
| フレームワーク | Vitest 3.0.0 |
| モック | `vi.fn()`, `vi.spyOn()` |
| アサーション | `expect()` (Vitest built-in) |
| stdin シミュレーション | Node.js `child_process.spawn` でスクリプトを子プロセス実行 |
| ファイルシステム | `node:fs/promises`（実FS使用。インメモリ代替なし） |

---

## ISSUE-001追加分

> **対応Issue**: ISSUE-001（WriteTargetScope issue パス認識 + PhaseGateQueryAdapter）
> **追加日**: 2026-03-28
> **参照設計**: `docs/inception/issues/ISSUE-001/logical_design.md` §3.3

### 8. HandlePreToolUseUseCase: issue パス対応（ISSUE-001）

**テスト方針**: Domainモデル（HookEvent, ProtectedFileList, WriteTargetScope, ProjectPaths, AsyncHookToCliTranslator）は実体を使用。ConfigQueryPortとPhaseGateQueryPortをモックとする。

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-HandlePreToolUse-ISSUE001-001 | issue パスへの Write がフェーズゲートでチェックされること | `{ toolName: 'Write', targetFilePaths: ['docs/inception/agent-integration/issues/ISSUE-001/tdd_implementation_plan.md'] }` | ConfigQueryPort: getProtectedFilePatterns=[]、getProjectPaths=デフォルトProjectPaths。PhaseGateQueryPort: checkGate → passed=true, blockers=[] | `{ shouldBlock: false }` かつ PhaseGateQueryPort.checkGate が `{ level: 3, unitId: 'agent-integration', storyId: 'ISSUE-001' }` のスコープで呼び出されたこと |
| IT-UC-HandlePreToolUse-ISSUE001-002 | issue パスへの Edit がフェーズゲートでチェックされること | `{ toolName: 'Edit', targetFilePaths: ['docs/inception/agent-integration/issues/ISSUE-001/logical_design.md'] }` | ConfigQueryPort: getProtectedFilePatterns=[]、getProjectPaths=デフォルトProjectPaths。PhaseGateQueryPort: checkGate → passed=true, blockers=[] | `{ shouldBlock: false }` かつ PhaseGateQueryPort.checkGate が呼び出されたこと |
| IT-UC-HandlePreToolUse-ISSUE001-003 | 横断的 issue パスへの Write はフェーズゲートチェック不適用で通過すること | `{ toolName: 'Write', targetFilePaths: ['docs/inception/issues/ISSUE-001/logical_design.md'] }` | ConfigQueryPort: getProtectedFilePatterns=[]、getProjectPaths=デフォルトProjectPaths。PhaseGateQueryPort: checkGate未呼び出し | `{ shouldBlock: false }` かつ PhaseGateQueryPort.checkGate が呼び出されないこと（Level 1 はフェーズゲート対象外） |
| IT-UC-HandlePreToolUse-ISSUE001-004 | issue パスへの NotebookEdit がフェーズゲートでチェックされること | `{ toolName: 'NotebookEdit', targetFilePaths: ['docs/inception/agent-integration/issues/ISSUE-001/scenario_test_design.md'] }` | ConfigQueryPort: getProtectedFilePatterns=[]、getProjectPaths=デフォルトProjectPaths。PhaseGateQueryPort: checkGate → passed=true, blockers=[] | `{ shouldBlock: false }` かつ PhaseGateQueryPort.checkGate が呼び出されたこと |
| IT-UC-HandlePreToolUse-ISSUE001-005 | Read ツールでの issue パスアクセスはフェーズゲートをスキップすること | `{ toolName: 'Read', targetFilePaths: ['docs/inception/agent-integration/issues/ISSUE-001/logical_design.md'] }` | ConfigQueryPort: getProtectedFilePatterns=[]、getProjectPaths=デフォルトProjectPaths | `{ shouldBlock: false }` かつ PhaseGateQueryPort.checkGate が呼び出されないこと（Read は Step 2 対象外） |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-UC-HandlePreToolUse-ISSUE001-006 | issue パスへの Write でフェーズゲート違反時にブロックされること | `{ toolName: 'Write', targetFilePaths: ['docs/inception/agent-integration/issues/ISSUE-001/tdd_implementation_plan.md'] }` | ConfigQueryPort: getProtectedFilePatterns=[]、getProjectPaths=デフォルトProjectPaths。PhaseGateQueryPort: checkGate → passed=false, blockers=['logical_design.md が存在しません'] | `{ shouldBlock: true, phaseGateBlockers: ['logical_design.md が存在しません'] }` |
| IT-UC-HandlePreToolUse-ISSUE001-007 | issue パスへの Edit でフェーズゲート違反時にブロックされること | `{ toolName: 'Edit', targetFilePaths: ['docs/inception/agent-integration/issues/ISSUE-001/scenario_test_design.md'] }` | ConfigQueryPort: getProtectedFilePatterns=[]、getProjectPaths=デフォルトProjectPaths。PhaseGateQueryPort: checkGate → passed=false, blockers=['logical_design.md が存在しません', 'scenario_test_design の前提が未完了'] | `{ shouldBlock: true, phaseGateBlockers: [...] }` |
| IT-UC-HandlePreToolUse-ISSUE001-008 | 保護対象ファイルチェック（Step 1）が issue パスより優先されること | `{ toolName: 'Write', targetFilePaths: ['biome.json', 'docs/inception/agent-integration/issues/ISSUE-001/logical_design.md'] }` | ConfigQueryPort: getProtectedFilePatterns=[] | `{ shouldBlock: true, blockedFilePath: 'biome.json' }` — Step 1 でブロックされ、Step 2（PhaseGateQueryPort）は呼び出されないこと |

### 9. PhaseGateQueryAdapter（ISSUE-001 / v2.2.0新規）

**テスト方針**: PhaseGateQueryAdapter の実体を使用。phase-dependency-model の動的 import は `vi.mock()` でモックし、`checkPhaseGateCommandHandler.execute()` のスタブ返却値を制御する。これにより Adapter 内の変換ロジック（exitCode → PhaseGateQueryResult）の正しさを検証する。ファイルシステム状態に依存しないため Flaky テストのリスクを排除する。

**テストファイル**: `scripts/harness/__tests__/integration/agent-integration/phase-gate-query-adapter.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-REPO-PhaseGateQueryAdapter-001 | フェーズゲート通過時に passed=true の PhaseGateQueryResult を返すこと | `WriteTargetScope.create({ level: 3, unitId: 'agent-integration', storyId: 'H11-05' })` | `checkPhaseGateCommandHandler.execute` → `{ exitCode: 0, text: '' }` | `PhaseGateQueryResult { passed: true, blockers: [], warnings: [] }` |
| IT-REPO-PhaseGateQueryAdapter-002 | フェーズゲート不通過時に passed=false と blockers 付きの結果を返すこと | `WriteTargetScope.create({ level: 3, unitId: 'agent-integration', storyId: 'H11-05' })` | `checkPhaseGateCommandHandler.execute` → `{ exitCode: 1, text: 'logical_design.md が存在しません' }` | `PhaseGateQueryResult { passed: false, blockers: ['logical_design.md が存在しません'] }` かつ blockers.length >= 1 |
| IT-REPO-PhaseGateQueryAdapter-003 | issue ID での呼び出しが正常に動作すること | `WriteTargetScope.create({ level: 3, unitId: 'agent-integration', storyId: 'ISSUE-001' })` | `checkPhaseGateCommandHandler.execute` → `{ exitCode: 0, text: '' }` | `PhaseGateQueryResult { passed: true, blockers: [], warnings: [] }` かつ `execute` が `{ targetLevel: 3, unitId: 'agent-integration', storyId: 'ISSUE-001' }` で呼ばれたこと |
| IT-REPO-PhaseGateQueryAdapter-004 | unitId のみ（storyId なし）の Level 2 スコープで呼び出しが成功すること | `WriteTargetScope.create({ level: 2, unitId: 'agent-integration' })` | `checkPhaseGateCommandHandler.execute` → `{ exitCode: 0, text: '' }` | `PhaseGateQueryResult { passed: true }` かつ `execute` が `{ targetLevel: 2, unitId: 'agent-integration', storyId: undefined }` で呼ばれたこと |

#### エラーハンドリング

| ケースID | シナリオ | モック設定 | 期待結果 |
|---------|---------|----------|---------|
| IT-REPO-PhaseGateQueryAdapter-005 | phase-dependency-model の動的 import が失敗した場合、安全側（passed=true, warning 付き）にフォールバックすること | `vi.mock()` で動的 import を reject させる | `PhaseGateQueryResult { passed: true, blockers: [], warnings: ['phase-dependency-model not available'] }` |
| IT-REPO-PhaseGateQueryAdapter-006 | checkPhaseGateCommandHandler 実行中にエラーが発生した場合、安全側にフォールバックすること | `checkPhaseGateCommandHandler.execute` が例外をthrow | `PhaseGateQueryResult { passed: true, blockers: [], warnings: ['phase-dependency-model not available'] }` |

### 10. HarnessConfigConfigQueryAdapter: issue パス対応（ISSUE-001）

**テスト方針**: HarnessConfigConfigQueryAdapterの実体を使用。フィクスチャのphasegate.config.jsonにproject.pathsセクションを含む設定を使用する。

#### 正常系

| ケースID | シナリオ | 入力/事前データ | 期待結果 |
|---------|---------|---------------|---------|
| IT-REPO-ConfigQueryAdapter-ISSUE001-001 | getProjectPaths() がデフォルトの ProjectPaths を返すこと | project.paths セクションを含む標準的な phasegate.config.json | `ProjectPaths { source: ['scripts/harness'], docs: { construction: 'docs/product/construction', inception: 'docs/inception' } }` |
| IT-REPO-ConfigQueryAdapter-ISSUE001-002 | getProjectPaths() でカスタムパスが正しく反映されること | `project.paths.source: ['src/core', 'src/lib']`, `project.paths.docs.inception: 'design/inception'` を含むフィクスチャ | `ProjectPaths { source: ['src/core', 'src/lib'], docs: { inception: 'design/inception', ... } }` |
| IT-REPO-ConfigQueryAdapter-ISSUE001-003 | project.paths セクションが未定義の場合にデフォルト値にフォールバックすること | project.paths セクションのない phasegate.config.json | デフォルトの `ProjectPaths` が返る（source: ['scripts/harness'], docs.inception: 'docs/inception', docs.construction: 'docs/product/construction'） |

### 11. Presentation Hook Adapter: issue パス対応（ISSUE-001）

**テスト方針**: UseCaseをモックし、PreToolUseHookHandler の stdin JSON パース → UseCase 呼び出しを検証する。exit code の検証に加え、`mockUseCase.execute` の引数を検証して、stdin から抽出された file_path が正しく UseCase に渡されていることを確認する。

#### 正常系

| ケースID | 入力（stdin JSON） | 期待レスポンス | 追加検証（UseCase 引数） |
|---------|-----------------|--------------|----------------------|
| IT-API-PreToolUse-ISSUE001-001 | `{ "tool_name": "Write", "tool_input": { "file_path": "docs/inception/agent-integration/issues/ISSUE-001/tdd_implementation_plan.md" } }` | フェーズゲート結果に応じて exit code 0（通過）または exit code 2（ブロック） | `mockUseCase.execute` が `expect.objectContaining({ targetFilePaths: ['docs/inception/agent-integration/issues/ISSUE-001/tdd_implementation_plan.md'] })` で呼ばれたこと |
| IT-API-PreToolUse-ISSUE001-002 | `{ "tool_name": "Write", "tool_input": { "file_path": "docs/inception/issues/ISSUE-001/logical_design.md" } }` | exit code 0（横断的 issue パス = Level 1 → フェーズゲート対象外で通過） | `mockUseCase.execute` が `expect.objectContaining({ targetFilePaths: ['docs/inception/issues/ISSUE-001/logical_design.md'] })` で呼ばれたこと |
| IT-API-PreToolUse-ISSUE001-003 | `{ "tool_name": "Read", "tool_input": { "file_path": "docs/inception/agent-integration/issues/ISSUE-001/logical_design.md" } }` | exit code 0（Read ツールは Step 2 対象外で通過） | `mockUseCase.execute` が `expect.objectContaining({ targetFilePaths: ['docs/inception/agent-integration/issues/ISSUE-001/logical_design.md'] })` で呼ばれたこと |

### 12. 統合フローテストケース: issue パス対応（ISSUE-001）

**テスト方針**: HarnessConfigConfigQueryAdapter（フィクスチャ設定）とDomainモデルを実体として使用。PhaseGateQueryPortのみモック。

| ケースID | シナリオ | 事前状態 | テスト操作 | 期待結果 |
|---------|---------|---------|-----------|---------|
| IT-UC-HookFlow-ISSUE001-001 | issue パスへの Write でフェーズゲート通過の End-to-End フロー | ConfigQueryAdapter=フィクスチャ設定、PhaseGateQueryPort=モック（passed=true） | HandlePreToolUseUseCase.execute({ toolName: 'Write', targetFilePaths: ['docs/inception/agent-integration/issues/ISSUE-001/logical_design.md'] }) | `{ shouldBlock: false }` — WriteTargetScope が level=3, unitId='agent-integration', storyId='ISSUE-001' で解決され、PhaseGateQueryPort が呼び出され、通過 |
| IT-UC-HookFlow-ISSUE001-002 | issue パスへの Write でフェーズゲートブロックの End-to-End フロー | ConfigQueryAdapter=フィクスチャ設定、PhaseGateQueryPort=モック（passed=false, blockers=['前提文書が存在しません']） | HandlePreToolUseUseCase.execute({ toolName: 'Write', targetFilePaths: ['docs/inception/agent-integration/issues/ISSUE-001/tdd_implementation_plan.md'] }) | `{ shouldBlock: true, phaseGateBlockers: ['前提文書が存在しません'] }` |
| IT-UC-HookFlow-ISSUE001-003 | 横断的 issue パスへの Write はフェーズゲート不適用で通過するフロー | ConfigQueryAdapter=フィクスチャ設定 | HandlePreToolUseUseCase.execute({ toolName: 'Write', targetFilePaths: ['docs/inception/issues/ISSUE-001/logical_design.md'] }) | `{ shouldBlock: false }` — WriteTargetScope が level=1 で解決され、PhaseGateQueryPort は呼び出されない |

---

## 13. ISSUE-001 シードデータ要件

| データセット | 用途 | 内容 |
|------------|------|------|
| `fixtures/harness-config-with-project-paths.json` | ConfigQueryAdapter ITテスト（ProjectPaths取得） | `project: { paths: { source: ['scripts/harness'], docs: { construction: 'docs/product/construction', inception: 'docs/inception' } } }` を含むHarnessConfigV2 |
| `fixtures/harness-config-custom-paths.json` | ConfigQueryAdapter ITテスト（カスタムパス） | `project: { paths: { source: ['src/core', 'src/lib'], docs: { construction: 'design/construction', inception: 'design/inception' } } }` を含むHarnessConfigV2 |

**フィクスチャ配置先**: `scripts/harness/__tests__/integration/agent-integration/fixtures/`

<!-- @work-item-id WI-166 -->
## 15. Hook skip observability integration tests

**テスト方針**: PostToolUse / Stop hook の skip path は実ファイルシステム上の temp project に `.phasegate/hook-skip-events.jsonl` を作り、JSON Lines として読めることを確認する。Recorder の write failure は明示的に注入し、元の hook exit code / result が変わらないことを検証する。

| ケースID | シナリオ | 入力/事前状態 | 期待結果 |
|---|---|---|---|
| IT-HOOK-SKIP-001 | PostToolUse が disabled の場合に skip event を記録すること | PostToolUse hook disabled config | JSON Lines に `hookType`, `reason`, `targetPaths`, `timestamp` が追記される |
| IT-HOOK-SKIP-002 | Stop hook が reentry 検出時に skip event を記録すること | ReentryGuard active | `reason="REENTRY_DETECTED"` の record が追記され、hook は再入をブロックしない |
| IT-HOOK-SKIP-003 | Recorder の書込失敗が hook result を変えないこと | `.phasegate` 書込不可 fixture | 元の skip result / exit code を維持し、write error は診断ログに限定 |
| IT-HOOK-SKIP-004 | harness-api status と同じ record shape を生成すること | 生成済み JSON Lines | `phasegate:status --json` の `hookHealth.latestSkipEvent` で読める shape と一致 |

---

## 14. ISSUE-001 テストケースサマリー

| セクション | ケース数 | 対象コンポーネント | 新規/追加 |
|-----------|---------|-------------------|----------|
| §8 HandlePreToolUseUseCase issue パス対応 | 8 | HandlePreToolUseUseCase + AsyncHookToCliTranslator + WriteTargetScope | 追加 |
| §9 PhaseGateQueryAdapter | 6 | PhaseGateQueryAdapter + PhaseGateQueryPort | 新規 |
| §10 HarnessConfigConfigQueryAdapter issue パス対応 | 3 | HarnessConfigConfigQueryAdapter + ProjectPaths | 追加 |
| §11 Presentation Hook Adapter issue パス対応 | 3 | pre-tool-use-hook.ts | 追加 |
| §12 統合フロー issue パス対応 | 3 | HandlePreToolUseUseCase End-to-End | 追加 |
| **合計** | **23** | | |

## 16. WI-203 Stop Hook Strict Mode Regression

<!-- @work-item-id WI-203 -->

| ケースID | シナリオ | 入力/事前状態 | 期待結果 |
|---|---|---|---|
| IT-AI-WI203-001 | downstream project に wrapper が存在しない状態で Stop hook を実行する | `agentIntegration.stopHook.enforce=true`, `scripts/harness/cli/complete-check.ts` なし | Stop hook は missing wrapper を理由に block せず、canonical `phasegate:complete-check` の実行結果だけで終了コードを決める |
| IT-AI-WI203-002 | strict mode で Complete Check 自体が fail する | canonical command が exit 1 | stdout reason は `Complete Check failed (exitCode=1)` |
| IT-AI-WI203-003 | strict mode で command wiring が fail する | stderr に missing module / legacy wrapper path | stdout reason は `Complete Check execution failed (exitCode=N)` |
## WI-214 Protected Path Integration

<!-- @work-item-id WI-214 -->
| Scenario | Expected |
|---|---|
| Config query adapter loads custom top-level `paths.principlesDocs` and `paths.folderRulesDoc` | Returned protected patterns include the custom principles glob and folder rules file in addition to configured protected patterns. |

## WI-304 SessionStart World obligations integration

<!-- @work-item-id WI-304 -->

| ID | 日本語シナリオ | 期待結果 |
|---|---|---|
| IT-WI304-ADAPTER-001 | World synthetic rootをpublic facade経由でqueryする | plain stable fields、report read/writeなし |
| IT-WI304-HOOK-001 | world disabledでsession-startを実行する | World sectionなし、exit 0 |
| IT-WI304-HOOK-002 | derive failureでsession-startを実行する | 固定warning一行、exit 0 |
| IT-WI304-DOGFOOD-001 | self-repoでsession-startを実行する | adopted legacy 604を一行集約、個別fingerprintなし |

hook JSON schemaと既存integrity / base contextの順序を保持し、World sectionだけを追加する。
<!-- @work-item-id WI-305 -->

## WI-305 hook integration

commit-msg subprocessでchanged fragment declaration結果を確認し、local fast-path文言とL3 authorityの分離を固定する。

## WI-384 Codex native payload integration

<!-- @work-item-id WI-384 -->

`codex-payload-compatibility.integration.test.ts` を temp project fixture で拡張し、upstream 必須 field
（`cwd`, `hook_event_name`, `model`, `permission_mode`, `session_id`, `tool_input`, `tool_name`,
`tool_use_id`, `transcript_path`, `turn_id`）を含む実 payload 形を使う。

Update / Add / Delete / 複数ファイル混在、protected / phase / full-mode violation、allow 時の空 stdout、
deny 時の exit 2 + 非空 stderr、command 欠落 fail-closed、optional agent fields を検証する。
PostToolUse apply_patch は既存 lint / skip flow へ進むことだけを検証し再解析しない。Bash redirect、
Bash heredoc apply_patch、Claude Write / Edit、L2 pre-commit backstop の既存 suites を回帰実行する。

## WI-385 Multi-runtime payload compatibility

<!-- @work-item-id WI-385 -->

Grok flat camel fixture は `hookEventName/sessionId/cwd/workspaceRoot/permissionMode/toolName/toolInput/toolUseId`
を含め、Antigravity nested fixture は `toolCall/conversationId/workspacePaths/transcriptPath/modelName/stepIdx`
を含める。temp project process で protected / phase / Full Mode deny と allowed write を実行し、shape ごとの
stdout JSON、stderr reason、exit 0 / 2 を独立に検証する。

Grok patch truncation、Antigravity unknown args key、mixed write target は mutation 前 fail-closed とする。
同じ gate fixture で Claude Write / Edit / Bash、Codex native apply_patch / Bash heredoc、Quick Mode allow /
Full Mode deny を回帰実行し、normalization 後の policy が runtime shape で変わらないことを証明する。

## WI-390 Config-state authorization integration

<!-- @work-item-id WI-390 -->

valid / missing / invalid-json / invalid-schema の temp project で config direct Write/Edit を process 実行し、
すべて exit 2 / PROTECTED_FILE になることを検証する。無関係 Bash、doctor 完走、gated path fail-closed は
ADR-038 の既存挙動を維持する。config が自分自身や Husky を exclude 済みでも trust root は外れない。
