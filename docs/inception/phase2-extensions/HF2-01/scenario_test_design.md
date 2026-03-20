# シナリオテスト設計: phase2-extensions

> **Unit ID**: phase2-extensions
> **作成日**: 2026-03-20
> **対応ストーリー**: HF2-01〜HF2-03
> **テスト配置**: `scripts/harness/__tests__/e2e/cli-harness.test.ts` 内の `phase2-extensions コマンド群` セクション
> **参照**: domain_model.md, logical_design.md, docs/principles/testing-rules.md

---

## 1. テスト方針

- CLI E2Eテスト: `npx tsx scripts/harness/main.ts` を `spawnSync` で起動し、標準出力・標準エラー・終了コードを検証
- テスト環境: `NODE_ENV=test`、プロジェクトルートが作業ディレクトリ
- タイムアウト: 30秒
- Git log呼び出しは実環境で動作（CIでも利用可能）

---

## 2. シナリオテストケース

### 2.1 p2:check-freshness コマンド

| ケースID | シナリオ | コマンド | 期待結果 |
|---------|---------|---------|---------|
| SC-P2-001 | p2:check-freshnessコマンドがCLIルーティングに登録されている | `p2:check-freshness` | stderrに "Unknown command" を含まない |
| SC-P2-002 | --dry-run オプションが受け付けられる | `p2:check-freshness --dry-run` | exit 0 |
| SC-P2-003 | --format json でJSON形式の出力が返る | `p2:check-freshness --format json` | exit 0、stdoutがJSON.parseで解析可能 |
| SC-P2-004 | --pattern で対象パターンを指定できる | `p2:check-freshness --pattern "docs/**/*.md"` | stderrに "Unknown command" を含まない |

### 2.2 p2:validate-pointers コマンド

| ケースID | シナリオ | コマンド | 期待結果 |
|---------|---------|---------|---------|
| SC-P2-005 | p2:validate-pointersコマンドがCLIルーティングに登録されている | `p2:validate-pointers` | stderrに "Unknown command" を含まない |
| SC-P2-006 | --include-urls オプションが受け付けられる | `p2:validate-pointers --include-urls` | stderrに "Unknown command" を含まない |
| SC-P2-007 | --format json でJSON形式の出力が返る | `p2:validate-pointers --format json` | exit 0、stdoutがJSON.parseで解析可能 |

### 2.3 p2:generate-e2e-template コマンド

| ケースID | シナリオ | コマンド | 期待結果 |
|---------|---------|---------|---------|
| SC-P2-008 | p2:generate-e2e-templateコマンドがCLIルーティングに登録されている | `p2:generate-e2e-template --phase test` | stderrに "Unknown command" を含まない |
| SC-P2-009 | --phase 引数なしでexit 2が返る | `p2:generate-e2e-template` | exit 2（必須引数不足） |
| SC-P2-010 | --phase 指定でテンプレートが生成される | `p2:generate-e2e-template --phase construction` | exit 0、stdoutにテンプレート内容を含む |

---

## 3. 受け入れ基準マッピング

| AC | 対応テストケース |
|----|----------------|
| HF2-01: 設計文書鮮度チェック | SC-P2-001〜004（CLIルーティング・オプション確認）、UT-P2-001〜030（VO/集約テスト）、IT-P2-001〜015（UseCase統合テスト） |
| HF2-02: ポインタ実在検証 | SC-P2-005〜007（CLIルーティング確認）、UT-P2-031〜050（VO/集約テスト）、IT-P2-016〜030（UseCase統合テスト） |
| HF2-03: E2Eテスト戦略テンプレート | SC-P2-008〜010（CLIルーティング・必須引数確認）、UT-P2-051〜065（VOテスト）、IT-P2-031〜041（UseCase統合テスト） |
