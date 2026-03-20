# ITテストロジック設計計画: quick-mode

## 1. スコープ

- 対象テストケース設計: `docs/product/construction/quick-mode/it_test_design.md`
- 参照論理設計: `docs/product/construction/quick-mode/logical_design.md`
- テストケース総数: 約87件
  - UseCase: 27件（JudgeEligibility×12, BuildRelaxation×7, ExecuteQuickCiCheck×8）
  - Adapter: 23件（GitDiff×10, HarnessConfig×7, ValidatorIdRegistry×6）
  - Handler+Formatter: 37件（CiCheckHandler×12, HumanFmt×5, AgentFmt×4, JsonFmt×4）

---

## 2. テストファイル構成（計画）

| テストファイル | 対象コンポーネント | ケース数 |
|---|---|---:|
| `scripts/harness/__tests__/integration/quick-mode/usecases/judge-quick-mode-eligibility-usecase.test.ts` | JudgeQuickModeEligibilityUseCase | 12 |
| `scripts/harness/__tests__/integration/quick-mode/usecases/build-relaxation-profile-usecase.test.ts` | BuildRelaxationProfileUseCase | 7 |
| `scripts/harness/__tests__/integration/quick-mode/usecases/execute-quick-ci-check-usecase.test.ts` | ExecuteQuickCiCheckUseCase | 8 |
| `scripts/harness/__tests__/integration/quick-mode/git-diff-changed-files-adapter.test.ts` | GitDiffChangedFilesAdapter | 10 |
| `scripts/harness/__tests__/integration/quick-mode/harness-config-quick-mode-config-adapter.test.ts` | HarnessConfigQuickModeConfigAdapter | 7 |
| `scripts/harness/__tests__/integration/quick-mode/validator-system-validator-id-registry-adapter.test.ts` | ValidatorSystemValidatorIdRegistryAdapter | 6 |
| `scripts/harness/__tests__/integration/quick-mode/presentation/ci-check-quick-mode-handler.test.ts` | CiCheckQuickModeHandler | 12 |
| `scripts/harness/__tests__/integration/quick-mode/presentation/human-quick-mode-formatter.test.ts` | HumanQuickModeFormatter | 5 |
| `scripts/harness/__tests__/integration/quick-mode/presentation/agent-quick-mode-formatter.test.ts` | AgentQuickModeFormatter | 4 |
| `scripts/harness/__tests__/integration/quick-mode/presentation/json-quick-mode-formatter.test.ts` | JsonQuickModeFormatter | 4 |

---

## 3. モック・フィクスチャ設計方針

### UseCase テスト（ポートのみモック）
- `ChangedFilesPort`, `QuickModeConfigPort`, `ValidatorIdRegistryPort` → `vi.fn()` でモック
- `QuickModeJudgmentEngine`, `ValidatorRelaxationService` → 実体を使用（Domain層モック禁止）
- `ExecuteQuickCiCheckUseCase`: `JudgeQuickModeEligibilityUseCase`, `BuildRelaxationProfileUseCase` も `vi.fn()` でモック（UseCase間依存）

### Adapter テスト（外部依存をspyOn）
- **GitDiffChangedFilesAdapter**: `vi.spyOn(childProcess, 'execSync')` でgit diff stdoutを制御
- **HarnessConfigQuickModeConfigAdapter**: `vi.spyOn(fs, 'readFile')` でファイル内容を制御（fixtureJSONを返す）
- **ValidatorSystemValidatorIdRegistryAdapter**: 静的定義のため実体テスト（モック不要）

### Handler テスト
- `ExecuteQuickCiCheckUseCase` → `vi.fn()` でモック
- `process.exit` → `vi.spyOn(process, 'exit').mockImplementation(() => { throw ... })` で終了コード検証
- `process.stdout.write` → `vi.spyOn(process.stdout, 'write')` で出力キャプチャ

### Formatter テスト
- 純粋関数（入力→文字列）。モック不要
- `QuickModeDecisionContract` のfixture定数を事前定義して注入

### シードデータ配置
```
scripts/harness/__tests__/integration/quick-mode/fixtures/
├── git-diff-fixture-modify.txt
├── git-diff-fixture-add.txt
├── git-diff-fixture-delete.txt
├── git-diff-fixture-rename.txt
├── git-diff-fixture-mixed.txt
├── harness-config-with-quickmode.json
├── harness-config-without-quickmode.json
├── harness-config-invalid-quickmode.json
├── quick-mode-decision-approved.fixture.ts    # eligible=true の QuickModeDecisionContract
└── quick-mode-decision-rejected.fixture.ts   # eligible=false (MIXED_CHANGES) の QuickModeDecisionContract
```

---

## 4. テストヘルパー設計

### インポートパス（ネスト別）
- ルート直下（git-diff-adapter等）: `../../helpers/test-helpers`（2段階）
- `usecases/` サブディレクトリ: `../../../helpers/test-helpers`（3段階）
- `presentation/` サブディレクトリ: `../../../helpers/test-helpers`（3段階）

> **NOTE**: quick-modeのWave 2テストはunit_test_logic.mdで修正済みの通り、`scripts/harness/__tests__/integration/quick-mode/` を基点とする。ルート直下は2段階、サブディレクトリは3段階。

### 共通ファクトリ（インライン定義）
- `createDefaultQuickModeConfig()`: デフォルト設定の `QuickModeConfig` 生成
- `createApprovedDecision()`: eligible=trueの `QuickModeDecisionContract` 生成
- `createRejectedDecision(rule)`: eligible=falseの `QuickModeDecisionContract` 生成

---

## 5. QA（不明点・確認事項）

なし。it_test_design.md にモック方針・フィクスチャ・テスト構成が詳細に記述されている。

---

## 6. 前提条件・リスク

- **DB不要**: ステートレス判定エンジン。永続化なし
- **child_process依存**: GitDiffAdapterは `execSync` をspy。実gitコマンドは実行しない
- **quick-mode はステートレス**: トランザクション・クリーンアップは不要
- **process.exit モック**: `vi.spyOn` 後 `mockImplementation(() => undefined)` で実際のプロセス終了を防ぐ。終了コードは引数で検証
