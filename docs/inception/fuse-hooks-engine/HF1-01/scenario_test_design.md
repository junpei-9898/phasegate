# シナリオテスト設計: fuse-hooks-engine

> **Unit ID**: fuse-hooks-engine
> **作成日**: 2026-03-20
> **対応ストーリー**: HF1-01〜HF1-05
> **テスト配置**: `scripts/harness/__tests__/e2e/cli-harness.test.ts` 内の `fuse-hooks-engine コマンド群` セクション
> **参照**: domain_model.md, logical_design.md, docs/principles/testing-rules.md

---

## 1. テスト方針

- CLI E2Eテスト: `npx tsx scripts/harness/main.ts` を `spawnSync` で起動し、標準出力・標準エラー・終了コードを検証
- テスト環境: `NODE_ENV=test`、プロジェクトルートが作業ディレクトリ
- タイムアウト: 30秒
- FUSE実装はスタブのため、実FUSEマウントのテストは行わない

---

## 2. シナリオテストケース

### 2.1 hooks:config コマンド

| ケースID | シナリオ | コマンド | 期待結果 |
|---------|---------|---------|---------|
| SC-HF-001 | hooks:configコマンドがCLIルーティングに登録されている | `hooks:config` | stderrに "Unknown command" を含まない |
| SC-HF-002 | hooks:config load サブコマンドがデフォルトで実行される | `hooks:config` | exit 0 または設定ファイル未検出のexit 2 |
| SC-HF-003 | hooks:config --yaml で指定ファイルパスを受け付ける | `hooks:config --yaml .harness-hooks.yml` | stderrに "Unknown command" を含まない |

### 2.2 hooks:gate-check コマンド

| ケースID | シナリオ | コマンド | 期待結果 |
|---------|---------|---------|---------|
| SC-HF-004 | hooks:gate-checkコマンドがCLIルーティングに登録されている | `hooks:gate-check` | stderrに "Unknown command" を含まない |
| SC-HF-005 | hooks:gate-check --story で必須引数を受け付ける | `hooks:gate-check --story HF1-01` | stderrに "Unknown command" を含まない |
| SC-HF-006 | hooks:gate-check 引数なしでの動作 | `hooks:gate-check` | exit 0 またはexit 2（引数不足）|

---

## 3. 受け入れ基準マッピング

| AC | 対応テストケース |
|----|----------------|
| HF1-01: YAMLフック定義ロード | SC-HF-001, SC-HF-003（CLIルーティング確認）、UT-HF-001〜025（VO/集約テスト）、IT-HF-001〜010（UseCase統合テスト） |
| HF1-02: FUSEパススルー評価 | IT-HF-011〜020（UseCase統合テスト、スタブ動作確認） |
| HF1-03: PreReadブロック | UT-HF-040〜050（ProtectedResourceListテスト） |
| HF1-04: シェルラッパー | UT-HF-060〜070（DestructiveCommandListテスト） |
| HF1-05: 完了ゲート | SC-HF-004〜006（CLIルーティング確認）、IT-HF-030〜040（CompletionGate統合テスト） |
