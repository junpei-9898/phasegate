---
traceability:
  initial_creation: true
work_item: WI-367
---

# WI-367 ユニット/IT テストケース設計（templates サーフェス）

<!-- @work-item-id WI-367 -->

Unit: `ci-governance`

## Unit テスト

### TemplateName（`__tests__/unit/ci-governance/value-objects/template-name.test.ts`）

| ID | 観点 | 期待 |
|----|------|------|
| UT-CG-TN-001 | 許容形式の name | そのままの値で生成できる |
| UT-CG-TN-002 | パス区切り・相対参照・拡張子付き | `InvalidTemplateNameError` |
| UT-CG-TN-003 | 空文字・大文字・先頭記号・空白 | `InvalidTemplateNameError` |
| UT-CG-TN-004 | `isValid` | 許容形式 true / パス含み false |
| UT-CG-TN-005 | `equals` / `toString` | 同値で true、値を返す |
| UT-CG-TN-006 | 異なる値の `equals` | false |

### TemplateCatalogEntry（`__tests__/unit/ci-governance/value-objects/template-catalog-entry.test.ts`）

| ID | 観点 | 期待 |
|----|------|------|
| UT-CG-TCE-001 | `<name>.template.<ext>` | name / fileName / extension を導出 |
| UT-CG-TCE-002 | 命名規約外 | `null` |
| UT-CG-TCE-003 | name 部分が不正 | `null`（catalog から除外） |

## IT テスト

### FileSystemTemplateCatalogAdapter（`__tests__/integration/ci-governance/file-system-template-catalog-adapter.test.ts`）

| ID | 観点 | 期待 |
|----|------|------|
| IT-CG-FSTC-001 | テンプレートと非テンプレートの混在 | 規約に合うものだけを name 昇順で返す |
| IT-CG-FSTC-002 | ディレクトリ不在 | 例外を投げず空一覧 |
| IT-CG-FSTC-003 | サブディレクトリ | catalog に含めない |
| IT-CG-FSTC-004 | 存在する name | 本文をそのまま返す |
| IT-CG-FSTC-005 | 存在しない name | `null` |
| IT-CG-FSTC-006 | **templates の外に同名ファイル** | `null`（外部ファイルを読まない） |
| IT-CG-FSTC-007 | `directoryPath` | harnessRoot 配下の絶対パス |

### TemplatesHandler（`__tests__/integration/ci-governance/templates-handler.test.ts`）

| ID | 観点 | 期待 |
|----|------|------|
| IT-CG-TH-001 | `list` | exit 0、name 一覧と show の案内 |
| IT-CG-TH-002 | `list --json` | パース可能な JSON |
| IT-CG-TH-003 | 空ディレクトリ | exit 0、0 件を通知 |
| IT-CG-TH-004 | `show <existing>` | exit 0、**本文だけ**を stdout（装飾を混ぜない） |
| IT-CG-TH-005 | name 省略 | exit 2、usage を stderr |
| IT-CG-TH-006 | traversal 3 パターン | exit 2、stdout 空、外部ファイル名を露出しない |
| IT-CG-TH-007 | 未知 name | exit 2、利用可能 name を案内 |
| IT-CG-TH-008 | 未知サブコマンド | exit 2、usage |

## E2E（`__tests__/e2e/cli-harness.test.ts`）

| 観点 | 期待 |
|------|------|
| `templates list` | exit 0、既知 name を列挙 |
| `templates show product_overview_plan` | exit 0、本文が出る |
| `templates show ../../package.json` | exit 2、`package.json` の内容が漏れない |
| `templates show nonexistent` | exit 2、利用可能 name を案内 |
| `templates bogus` | exit 2、usage |
| `templates --help` | exit 0、契約表示 |

## conformance

`__tests__/integration/harness-api/known-harness-commands-conformance.test.ts`
が `KNOWN_HARNESS_COMMANDS` と main.ts の `case` ラベル集合の一致・ソート順を強制する。

## カバレッジ方針

`templates show` の解決経路（catalog 照合）は 3 種の traversal 入力・未知 name・
外部同名ファイルの 5 ケースで塞ぐ。「入力を検証する」側（`TemplateName`）だけでなく
「入力をパスに使わない」側（`IT-CG-FSTC-006`）を必ず 1 ケース持つこと。
前者だけでは、将来 VO のパターンを緩めた瞬間に traversal が復活する。
