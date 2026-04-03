# ITテスト設計計画: quick-mode

> **作成日**: 2026-03-19
> **対象Unit**: quick-mode
> **対応ストーリー**: H10-01, H10-02, H10-03
> **Wave**: 2（コア品質機構）
> **参照ドキュメント**:
> - `docs/product/construction/quick-mode/logical_design.md`
> - `docs/product/units/integration_contract.md`
> - `docs/product/construction/quick-mode/domain_model.md`
> - `docs/product/environment_contract.md`
> - `docs/principles/testing-rules.md`

---

## 1. スコープ

### 対象Unitの論理設計

quick-mode は `phasegate:ci-check --quick` フラグに対応するUnit。`ChangedFile[]` の分類・Quick Mode適用可否判定・ValidatorRelaxationProfile生成・統合実行の4処理を3つのUseCaseに分担する。

本ITテスト設計は以下の層を対象とする：

- **Application層**: UseCase（Port経由での統合テスト）
- **Infrastructure層**: Adapter（外部I/O統合テスト）
- **Presentation層**: Handler / Formatter（終了コード・出力形式統合テスト）

Domain層（VO・ドメインサービス）はUnitテスト対象であり、ITテストのスコープ外とする。

### テスト対象コンポーネント一覧

| 種別 | コンポーネント | 対応ストーリー |
|------|---------------|--------------|
| UseCase | JudgeQuickModeEligibilityUseCase | H10-01 |
| UseCase | BuildRelaxationProfileUseCase | H10-02 |
| UseCase | ExecuteQuickCiCheckUseCase | H10-03 |
| Adapter | GitDiffChangedFilesAdapter | H10-01 |
| Adapter | HarnessConfigQuickModeConfigAdapter | H10-01, H10-02 |
| Adapter | ValidatorSystemValidatorIdRegistryAdapter | H10-02 |
| Handler | CiCheckQuickModeHandler | H10-03 |
| Formatter | HumanQuickModeFormatter | H10-03 |
| Formatter | AgentQuickModeFormatter | H10-03 |
| Formatter | JsonQuickModeFormatter | H10-03 |

---

## 2. テスト対象分析

### UseCase

| UseCase名 | 依存Port数 | テストケース概算 |
|-----------|-----------|---------------|
| JudgeQuickModeEligibilityUseCase | 2（ChangedFilesPort, QuickModeConfigPort） | 12〜15件（正常系4 + 異常系3拒否ルール + Port失敗3 + 境界値3） |
| BuildRelaxationProfileUseCase | 2（QuickModeConfigPort, ValidatorIdRegistryPort） | 8〜10件（正常系3 + eligible=false拒否2 + Port失敗2 + 不変条件確認3） |
| ExecuteQuickCiCheckUseCase | 3（上記2 UseCase + mapper） | 10〜12件（正常系eligible分岐2 + dryRunフラグ2 + changedFiles明示/省略2 + 統合異常系3） |

### Repository（Infrastructure Adapter）

| Adapter名 | 操作種別 | テストケース概算 |
|----------|---------|---------------|
| GitDiffChangedFilesAdapter | git diff実行・パース | 10〜12件（M/A/D/R各パターン + 複数ファイル + git未利用可能 + 非gitディレクトリ） |
| HarnessConfigQuickModeConfigAdapter | phasegate.config.json読取 | 8〜10件（quickModeセクション有無 + デフォルトフォールバック + ファイル不在 + JSONパースエラー） |
| ValidatorSystemValidatorIdRegistryAdapter | 静的ID一覧返却 | 4〜5件（ID一覧の完全性 + L1/L2/L3/L4各レイヤー件数 + 期待ID一覧との一致） |

### Controller/API（Handler / Formatter）

| コンポーネント | 種別 | テストケース概算 |
|--------------|------|---------------|
| CiCheckQuickModeHandler | Handler | 10〜12件（--fail-on-reject/--dry-run/--format各フラグ + 終了コード0/1/2分岐） |
| HumanQuickModeFormatter | Formatter | 6〜8件（eligible=true/false + rejectionRule各種 + プロファイルサマリー出力） |
| AgentQuickModeFormatter | Formatter | 6〜8件（rejectedFiles詳細 + skipped validators詳細 + 決定論的出力） |
| JsonQuickModeFormatter | Formatter | 4〜6件（QuickModeDecisionContract JSON整形 + 構造検証） |

---

## 3. テスト方針

### モック/スタブの使用方針

- **UseCase ITテスト**: PortのみをVitestモック（`vi.fn()`）に置き換える。QuickModeJudgmentEngine / ValidatorRelaxationService は**実体を使用**する（Domain モック禁止）
- **Adapter ITテスト**: 実際のファイルシステム・git操作を対象とし、fixtureファイルを用いる。外部コマンド（git）はspawnSync/execSyncのモック化またはfixture入力で代替する
- **Handler ITテスト**: ExecuteQuickCiCheckUseCaseをテストダブルに置き換え、Handler/Formatterの責務に集中する

### DBテストの方針

quick-modeは永続化を持たない（ステートレス判定エンジン）。DBテストは不要。Adapterテストは以下のfixtureを使用する：

- `phasegate.config.json` fixture（quickModeセクション有無の2パターン）
- git diff出力の fixture文字列（M/A/D/R各パターン）
- ValidatorIdRegistry の静的定義（実装コードから直接検証）

### 認証・認可のテスト方針

`integration_contract.md §8` の通り、quick-mode は認証・認可機構を持たない。認証テストは不要。

### テスト配置

| テスト種別 | 配置先 |
|----------|--------|
| UseCase IT | `scripts/harness/__tests__/integration/quick-mode/usecases/` |
| Adapter IT | `scripts/harness/__tests__/integration/quick-mode/` |
| Handler/Formatter IT | `scripts/harness/__tests__/integration/quick-mode/presentation/` |

---

## 4. QA（不明点・確認事項）

### [Question] Q1: GitDiffChangedFilesAdapterの外部コマンドモック方針

git diff コマンドの実行方法（execSync/spawnSync）をITテストでどう扱うか。実際の git コマンド実行を前提とするか、stdout fixture を直接注入するか判断が必要。

**推奨案**: `child_process.execSync` を `vi.spyOn` でモックし、fixture の stdout 文字列を返す方式を採用する。これによりgit環境依存を排除し、テストの再現性を確保する。

[Answer]
`vi.spyOn(childProcess, 'execSync')` でstdoutをfixtureから返す方式で進める。

### [Question] Q2: CiCheckQuickModeHandlerの終了コードテスト方法

Handlerが `process.exit()` を呼ぶ場合、Vitestテスト内でプロセス終了をどう検証するか。

**推奨案**: `process.exit` を `vi.spyOn` でモックし、呼び出し引数（終了コード）を検証する方式を採用する。

[Answer]
`vi.spyOn(process, 'exit')` でモックする方式で進める。

---

## 5. 前提条件・リスク

### 前提条件

- `logical_design.md` に記載の全UseCaseの処理フロー・例外定義を正規ソースとする
- `integration_contract.md §9` のValidatorID一覧（L1-001〜L4-003、計15 ID）がAdapterの静的定義と一致することを前提とする
- テスト名は日本語。`target` / `context` / `describe` / `it` 構造。AAAパターン（`actual` 変数使用）を遵守する
- Domain モデル（VO・サービス）は実体を使用し、モック化しない

### リスク

| リスク | 対応方針 |
|--------|---------|
| git環境依存でのAdapter ITテスト不安定化 | execSync/spawnSync をvi.spyOnでモック化し、fixture文字列を入力とする |
| ValidatorID一覧の将来的な変更 | Adapterの静的定義をcontract.mdと照合するテストを設け、差分を早期検出する |
| ExecuteQuickCiCheckUseCaseのdryRunフラグにおけるvalidator-system呼び出し有無 | Wave 2ではvalidator-system連携はPort経由のため、Portのモック呼び出し有無で検証する |
