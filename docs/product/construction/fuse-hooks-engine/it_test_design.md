# ITテスト設計: fuse-hooks-engine

> **Unit ID**: fuse-hooks-engine
> **作成日**: 2026-03-20
> **対応ストーリー**: HF1-01, HF1-02, HF1-03, HF1-04, HF1-05
> **Wave**: 2
> **参照**: domain_model.md, logical_design.md, docs/principles/testing-rules.md

---

## 1. 対象コンポーネント

- **UseCase**: LoadHookConfigUseCase, EvaluateHookEventUseCase, CheckCompletionGateUseCase, ExecuteFallbackHookUseCase, ValidateHookYamlUseCase
- **Infrastructure Adapter**: YamlHookConfigReaderAdapter, FusePreWriteHandlerAdapter（stub）, FallbackPreWriteAdapter, FallbackPreReadAdapter, ShellWrapperAdapter, CompletionGateFileAdapter
- **Presentation Handler**: HookConfigHandler, CompletionGateHandler
- **Cross-Layer Integration**: フック設定ロード統合フロー, FUSEイベント評価統合フロー, 完了ゲート確認統合フロー

---

## 2. シードデータ要件

### 2.1 `.harness-hooks.yml` テスト用

```yaml
# テスト用 .harness-hooks.yml（正常系）
version: 1
hooks:
  - type: pre-write
    files:
      include:
        - "**/*.env"
        - ".harness/**"
    action:
      type: block-write
      config:
        reason: "Sensitive file protection"
        notifyUser: true
    description: "Sensitive file protection hook"

  - type: pre-read
    files:
      include:
        - "**/*.env"
    action:
      type: allow-read
      config:
        maxAccessCount: 3
    description: "Env file read limit hook"

  - type: on-complete
    files:
      include:
        - ".harness/done/*.done"
    action:
      type: trigger-completion-check
      config:
        gateId: "story-gate"
    description: "Completion trigger hook"

protectedResources:
  - "**/*.env"
  - ".harness/secrets/**"

destructiveCommands:
  - command: "rm"
    dangerousOptions: ["-rf", "-fr"]
  - command: "git"
    dangerousOptions: ["reset --hard", "clean -f"]

completionGates:
  - storyId: "HF1-05"
    magicFilePath: ".harness/done/HF1-05.done"
    requiredFields: ["storyId", "completedAt"]
```

```yaml
# テスト用 .harness-hooks.yml（INV-4違反: pre-read + block-write）
version: 1
hooks:
  - type: pre-read
    files:
      include: ["**/*.ts"]
    action:
      type: block-write
      config:
        reason: "Invalid"
        notifyUser: false
```

### 2.2 CompletionGate永続化テスト用

```json
// テスト用 .harness/completion-state.json
{
  "version": 1,
  "gates": [
    {
      "storyId": "HF1-05",
      "magicFilePath": ".harness/done/HF1-05.done",
      "status": "passed",
      "checkedAt": "2026-03-20T00:00:00Z",
      "failureReason": null
    },
    {
      "storyId": "HF1-04",
      "magicFilePath": ".harness/done/HF1-04.done",
      "status": "failed",
      "checkedAt": null,
      "failureReason": "magic file not found"
    }
  ]
}
```

---

## 3. テスト環境設定

| 設定項目 | 内容 |
|---------|------|
| テストフレームワーク | Vitest 3.0.0 |
| テストヘルパー | `scripts/harness/__tests__/helpers/test-helpers.ts`（target/contextエイリアス） |
| モックライブラリ | Vitestビルトイン `vi.fn()` / `vi.spyOn()` |
| テスト用tmpディレクトリ | `os.tmpdir()` + テスト固有サブディレクトリ（`fuse-hooks-engine-test-${Date.now()}`） |
| ファイルI/Oテスト | 実際のファイルシステム操作（tmpdir内に実ファイルを作成して検証） |
| FUSE関連アダプタ | スタブ実装のみ（実FUSEカーネルへの依存なし） |
| 外部Unitアダプタ | 全モック化（harness-error / config-foundation / traceability-model の実実装には依存しない） |

---

## 4. UseCaseテストケース

### 4.1 LoadHookConfigUseCase（HF1-01）

**テスト配置**: `scripts/harness/__tests__/integration/fuse-hooks-engine/load-hook-config-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-HF-001 | 有効な.harness-hooks.ymlをロードするとHookDefinition[]が返ること | `yamlPath='.harness-hooks.yml'` | HookConfigReaderPort: `read()`→有効なHookYamlConfig（3件のhook） | `definitions.length=3`, `errors=[]` |
| IT-HF-002 | protectedResourcesフィールドが存在する場合にProtectedResourceListが返ること | `yamlPath='.harness-hooks.yml'` | HookConfigReaderPort: `read()`→protectedResources付きHookYamlConfig | `protectedResources.length=2` |
| IT-HF-003 | hooksが空配列のYAMLをロードすると空のdefinitions[]が返ること | `yamlPath='.harness-hooks.yml'` | HookConfigReaderPort: `read()`→hooks=[]のHookYamlConfig | `definitions.length=0`, `errors=[]` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-HF-004 | YAML解析エラーが発生した場合にエラーが返ること | `yamlPath='.harness-hooks.yml'` | HookConfigReaderPort: `read()`→Result.fail([HOOK_YAML_PARSE_ERROR]) | `errors`にHOOK_YAML_PARSE_ERRORが含まれる、`definitions=[]` |
| IT-HF-005 | INV-4違反（pre-read + block-write）のhookエントリでエラーが返ること | `yamlPath='.harness-hooks.yml'` | HookConfigReaderPort: `read()`→INV-4違反エントリを含むHookYamlConfig | `errors`にHOOK_ACTION_TYPE_MISMATCHが含まれる |

---

### 4.2 EvaluateHookEventUseCase（HF1-02）

**テスト配置**: `scripts/harness/__tests__/integration/fuse-hooks-engine/evaluate-hook-event-usecase.test.ts`

#### 正常系（FUSEモード）

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-HF-006 | mounted状態でwrite イベントがblock-writeフックにマッチしてblocked=trueが返ること | `filePath='.env'`, `eventType='write'`, `mountStatus='mounted'` | FuseHandlerPort: スタブ実行; HookDefinitions: pre-writeフック（**.env→block-write） | `blocked=true`, `actions=[block-write]`, `errors=[]` |
| IT-HF-007 | mounted状態でwrite イベントがどのフックにもマッチしない場合blocked=falseが返ること | `filePath='src/utils.ts'`, `eventType='write'`, `mountStatus='mounted'` | FuseHandlerPort: スタブ実行; HookDefinitions: pre-writeフック（**.env→block-write） | `blocked=false`, `actions=[]`, `errors=[]` |
| IT-HF-008 | run-shellアクションのフックにマッチした場合にShellWrapperPortが呼ばれること | `filePath='src/index.ts'`, `eventType='write'`, `mountStatus='mounted'` | ShellWrapperPort: `execute()`→exitCode=0; HookDefinitions: post-writeフック（run-shell） | `blocked=false`, `errors=[]`. ShellWrapperPort.execute()が1回呼ばれる |

#### 正常系（フォールバックモード）

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-HF-009 | fallback='L1'状態でwrite イベントがFallbackHandlerPort経由でブロックされること | `filePath='.env'`, `eventType='write'`, `mountStatus='fallback'`, `fallbackMode='L1'` | FallbackHandlerPort: `handlePreWrite()`→block-write HookAction返却 | `blocked=true`, `errors=[]` |
| IT-HF-010 | fallback='L4'状態ではフック評価が行われずactions=[]が返ること | `filePath='.env'`, `eventType='write'`, `mountStatus='fallback'`, `fallbackMode='L4'` | FallbackHandlerPort: `handlePreWrite()`→null返却（L4は機能なし） | `blocked=false`, `actions=[]` |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-HF-011 | mountStatus='error'状態ではFUSE_MOUNT_ERRORが返ること | `filePath='.env'`, `eventType='write'`, `mountStatus='error'` | モックなし | `errors`にFUSE_MOUNT_ERRORが含まれる |
| IT-HF-012 | run-shellアクションで破壊的コマンドが検出された場合にDESTRUCTIVE_COMMAND_BLOCKEDが返ること | `filePath='src/index.ts'`, `eventType='post-write'`, `mountStatus='mounted'` | HookDefinitions: post-writeフック（`rm -rf`スクリプト）; DestructiveCommandList: rm -rf を危険コマンドとして登録 | `errors`にDESTRUCTIVE_COMMAND_BLOCKEDが含まれる |

---

### 4.3 CheckCompletionGateUseCase（HF1-05）

**テスト配置**: `scripts/harness/__tests__/integration/fuse-hooks-engine/check-completion-gate-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-HF-013 | マジックファイルが存在する場合にgateStatus='passed'が返ること | `storyId='HF1-05'`, `magicFilePath='.harness/done/HF1-05.done'` | CompletionGatePort: `load()`→pending状態のGate; tmpdir内に実マジックファイルを作成 | `gateStatus='passed'`, `checkedAt`が非null, `failureReason=null` |
| IT-HF-014 | マジックファイルが存在しない場合にgateStatus='failed'が返ること | `storyId='HF1-05'`, `magicFilePath='.harness/done/HF1-05.done'` | CompletionGatePort: `load()`→pending状態のGate; マジックファイルは作成しない | `gateStatus='failed'`, `failureReason`が'magic file not found'を含む |
| IT-HF-015 | 既存のpassed状態のGateに対してcanRecheck()=falseで再チェックがスキップされること | `storyId='HF1-05'` | CompletionGatePort: `load()`→passed状態のGate（checkedAt非null） | `gateStatus='passed'`. CompletionGatePort.save()が呼ばれない |
| IT-HF-016 | 既存のfailed状態のGateに対してcanRecheck()=trueで再チェックが実行されること | `storyId='HF1-04'`, `magicFilePath='.harness/done/HF1-04.done'` | CompletionGatePort: `load()`→failed状態のGate; tmpdir内にマジックファイルを作成 | `gateStatus='passed'`. 再チェックが成功 |

#### 異常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-HF-017 | CompletionGatePortのsaveが失敗した場合にCOMPLETION_GATE_IO_ERRORが返ること | `storyId='HF1-05'`, `magicFilePath='.harness/done/HF1-05.done'` | CompletionGatePort: `load()`→pending; `save()`→エラーをスロー; マジックファイル存在 | `errors`にCOMPLETION_GATE_IO_ERRORが含まれる |

---

### 4.4 ExecuteFallbackHookUseCase（HF1-02〜04フォールバック）

**テスト配置**: `scripts/harness/__tests__/integration/fuse-hooks-engine/execute-fallback-hook-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-HF-018 | L1フォールバックでpre-writeイベントが処理されること | `filePath='.env'`, `eventType='write'`, `fallbackMode='L1'` | FallbackHandlerPort: `handlePreWrite()`→block-write HookAction | `action.actionType='block-write'`, `errors=[]` |
| IT-HF-019 | L4フォールバックではaction=nullが返ること | `filePath='.env'`, `eventType='write'`, `fallbackMode='L4'` | FallbackHandlerPort: `handlePreWrite()`→null | `action=null`, `errors=[]` |

---

### 4.5 ValidateHookYamlUseCase（HF1-01検証専用）

**テスト配置**: `scripts/harness/__tests__/integration/fuse-hooks-engine/validate-hook-yaml-usecase.test.ts`

#### 正常系

| ケースID | シナリオ | 入力 | モック設定 | 期待結果 |
|---------|---------|------|----------|---------|
| IT-HF-020 | 有効な.harness-hooks.ymlに対してvalid=trueが返ること | `yamlPath='.harness-hooks.yml'` | HookConfigReaderPort: `read()`→有効なHookYamlConfig | `valid=true`, `errors=[]` |
| IT-HF-021 | 無効な.harness-hooks.ymlに対してvalid=falseとエラーが返ること | `yamlPath='.harness-hooks.yml'` | HookConfigReaderPort: `read()`→Result.fail([HOOK_YAML_PARSE_ERROR]) | `valid=false`, `errors`にHOOK_YAML_PARSE_ERRORが含まれる |

---

## 5. Infrastructure Adapterテストケース

### 5.1 YamlHookConfigReaderAdapter

**テスト配置**: `scripts/harness/__tests__/integration/fuse-hooks-engine/yaml-hook-config-reader-adapter.test.ts`

| ケースID | シナリオ | 期待結果 |
|---------|---------|---------|
| IT-HF-022 | 有効なYAMLファイルを読み取りHookYamlConfigを返せること | `Result.ok(HookYamlConfig)`。`hooks.length=3` |
| IT-HF-023 | 存在しないYAMLファイルパスでエラーが返ること | `Result.fail([HOOK_YAML_NOT_FOUND])` |
| IT-HF-024 | YAML構文エラーファイルでHOOK_YAML_PARSE_ERRORが返ること | `Result.fail([HOOK_YAML_PARSE_ERROR])` |
| IT-HF-025 | AJVスキーマバリデーション失敗（versionフィールドなし）でエラーが返ること | `Result.fail([HOOK_YAML_SCHEMA_ERROR])` |

---

### 5.2 CompletionGateFileAdapter

**テスト配置**: `scripts/harness/__tests__/integration/fuse-hooks-engine/completion-gate-file-adapter.test.ts`

| ケースID | シナリオ | 期待結果 |
|---------|---------|---------|
| IT-HF-026 | 存在しないstoryIdをloadするとnullが返ること | `null` |
| IT-HF-027 | saveしたCompletionGateをloadで復元できること | 保存したstatus・checkedAt・failureReasonが一致する |
| IT-HF-028 | .harness/completion-state.jsonが破損している場合にCOMPLETION_GATE_IO_ERRORが返ること | `COMPLETION_GATE_IO_ERROR` |

---

### 5.3 ShellWrapperAdapter

**テスト配置**: `scripts/harness/__tests__/integration/fuse-hooks-engine/shell-wrapper-adapter.test.ts`

| ケースID | シナリオ | 期待結果 |
|---------|---------|---------|
| IT-HF-029 | 安全なスクリプト（echo hello）をexecuteするとexitCode=0・stdoutが返ること | `exitCode=0`, `stdout='hello\n'` |
| IT-HF-030 | 破壊的コマンド（rm -rf）を含むスクリプトでDESTRUCTIVE_COMMAND_BLOCKEDが返ること | HarnessError（DESTRUCTIVE_COMMAND_BLOCKED）がスローされる |
| IT-HF-031 | exitCode=1のスクリプトでfailOnNonZero=trueのときSHELL_HOOK_FAILEDが返ること | HarnessError（SHELL_HOOK_FAILED）がスローされる |

---

## 6. 統合フローテストケース

### 6.1 フック設定ロード→評価統合フロー

**テスト配置**: `scripts/harness/__tests__/integration/fuse-hooks-engine/hook-config-load-evaluate-flow.test.ts`

| ケースID | シナリオ | 期待結果 |
|---------|---------|---------|
| IT-HF-032 | YAMLをロードしてwriteイベントを評価し、フックが適用されること | LoadHookConfigUseCase→EvaluateHookEventUseCaseの連続呼び出しでblocked=trueが返る |
| IT-HF-033 | YAMLをロードして該当なしのwriteイベントを評価し、blocked=falseが返ること | blocked=false、actions=[] |

---

### 6.2 完了ゲート確認統合フロー

**テスト配置**: `scripts/harness/__tests__/integration/fuse-hooks-engine/completion-gate-flow.test.ts`

| ケースID | シナリオ | 期待結果 |
|---------|---------|---------|
| IT-HF-034 | on-completeフックのマッチ→CheckCompletionGateUseCaseの呼び出し→passedになること | EvaluateHookEventUseCase（on-completeマッチ）→CheckCompletionGateUseCase（passed）連続成功 |
| IT-HF-035 | 完了ゲートの初回作成→failed→再チェック→passedの状態遷移が行われること | pending→failed→passed の3ステップ状態遷移を検証 |

---

## 7. Presentation Handlerテストケース

### 7.1 HookConfigHandler

**テスト配置**: `scripts/harness/__tests__/integration/fuse-hooks-engine/hook-config-handler.test.ts`

| ケースID | シナリオ | 期待結果 |
|---------|---------|---------|
| IT-HF-036 | `harness:hook-config load` でhooks一覧が標準出力に表示されること | exitCode=0、stdoutにHookDefinition情報が含まれる |
| IT-HF-037 | `harness:hook-config validate` でvalid=trueの場合にexitCode=0が返ること | exitCode=0 |
| IT-HF-038 | `harness:hook-config validate` でバリデーションエラーがある場合にexitCode=1が返ること | exitCode=1、stderrにエラー情報が含まれる |

---

### 7.2 CompletionGateHandler

**テスト配置**: `scripts/harness/__tests__/integration/fuse-hooks-engine/completion-gate-handler.test.ts`

| ケースID | シナリオ | 期待結果 |
|---------|---------|---------|
| IT-HF-039 | `harness:gate-check HF1-05` でpassed状態のGateが存在する場合にexitCode=0が返ること | exitCode=0、stdoutに'passed'が含まれる |
| IT-HF-040 | `harness:gate-check HF1-04` でfailed状態のGateが存在する場合にexitCode=1が返ること | exitCode=1、stderrにfailureReasonが含まれる |

---

## 8. テストケース総数サマリー

| 対象コンポーネント | 正常系 | 異常系 | 統合フロー | 合計 |
|----------------|-------|-------|---------|------|
| LoadHookConfigUseCase | 3 | 2 | — | 5 |
| EvaluateHookEventUseCase | 5 | 2 | — | 7 |
| CheckCompletionGateUseCase | 4 | 1 | — | 5 |
| ExecuteFallbackHookUseCase | 2 | — | — | 2 |
| ValidateHookYamlUseCase | 1 | 1 | — | 2 |
| YamlHookConfigReaderAdapter | 1 | 3 | — | 4 |
| CompletionGateFileAdapter | 1 | 2 | — | 3 |
| ShellWrapperAdapter | 1 | 2 | — | 3 |
| フック設定ロード→評価統合 | — | — | 2 | 2 |
| 完了ゲート確認統合 | — | — | 2 | 2 |
| HookConfigHandler | 1 | 2 | — | 3 |
| CompletionGateHandler | 1 | 1 | — | 2 |
| **合計** | **20** | **16** | **4** | **40** |
