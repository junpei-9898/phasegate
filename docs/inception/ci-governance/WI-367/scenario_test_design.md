---
traceability:
  initial_creation: true
work_item: WI-367
---

# WI-367 / WI-368 / WI-369 シナリオテスト設計

<!-- @work-item-id WI-367, WI-368, WI-369 -->

対象 Unit: `ci-governance`
シナリオ実行面: CLI（`bin/harness` 経由の E2E、および composition root 経由の IT）

---

## SC-01: テンプレート一覧を node_modules を読まずに取得する（WI-367）

| # | 操作 | 期待 |
|---|------|------|
| 1 | `phasegate templates list` | exit 0 |
| 2 | 出力 | `logical_design` / `product_overview_plan` 等の name が列挙される |
| 3 | 出力 | ファイルパスではなく **name** が主表示（コピーして `show` に渡せる） |

## SC-02: テンプレート本文を stdout で受け取る（WI-367）

| # | 操作 | 期待 |
|---|------|------|
| 1 | `phasegate templates show logical_design` | exit 0 |
| 2 | 出力 | テンプレート本文がそのまま stdout に出る（装飾ヘッダを混ぜない） |

## SC-03: path traversal を拒否する（WI-367）

| # | 操作 | 期待 |
|---|------|------|
| 1 | `phasegate templates show ../../package.json` | exit 2 |
| 2 | 出力 | `package.json` の中身が一切出力されない |
| 3 | `phasegate templates show /etc/passwd` | exit 2 |
| 4 | `phasegate templates show nonexistent` | exit 2 + 利用可能 name の案内 |

## SC-04: 未指定 / 未知サブコマンド（WI-367）

| # | 操作 | 期待 |
|---|------|------|
| 1 | `phasegate templates show`（name 無し） | exit 2 + usage |
| 2 | `phasegate templates bogus` | exit 2 + usage |

## SC-05: plan 文書 scaffold のラウンドトリップ（WI-368・最重要）

preset `minimal` の空プロジェクトを想定する。

| # | 操作 | 期待 |
|---|------|------|
| 1 | `check-phase-gate --level 2` | 失敗（product_overview_plan.md / product_overview.md が blocker） |
| 2 | `scaffold-inception --kind product-overview-plan --apply` | exit 0、ファイル生成 |
| 3 | `scaffold-inception --kind product-overview --apply` | exit 0、ファイル生成 |
| 4 | `check-phase-gate --level 2` | **exit 0 / blockers 空**（生成物を一切編集せずに通る） |

## SC-06: 全 plan テンプレートが QA evidence を満たす（WI-368）

preset `standard` で、範囲外文書（`user_stories.md`）のみ手書きで補う。

| # | 操作 | 期待 |
|---|------|------|
| 1 | 4 種の plan kind + `product-overview` を `--apply` | 全て exit 0 |
| 2 | `user_stories.md` を手書き配置 | — |
| 3 | `check-phase-gate --level 2` | exit 0（Level-1 の plan evidence が全て充足） |

## SC-07: 既存ファイル保護（WI-368）

| # | 操作 | 期待 |
|---|------|------|
| 1 | 同じ kind を 2 回 `--apply` | 2 回目は exit 2（`--force` 案内） |
| 2 | `--force` 付きで再実行 | exit 0、上書き |
| 3 | dry-run（既定） | ファイルが作られない、exit 0 |

## SC-08: `paths` 追従（WI-368 / WI-369）

`paths.designDocs = mydocs/product/construction`,
`paths.inceptionDocs = mydocs/inception` の config を持つプロジェクト。

| # | 操作 | 期待 |
|---|------|------|
| 1 | `scaffold-inception --kind product-overview-plan --apply` | `mydocs/inception/_shared/` に生成 |
| 2 | `scaffold-inception --kind product-overview --apply` | `mydocs/product/product_overview.md` に生成 |
| 3 | `scaffold-design --unit sample --phase logical --apply` | `mydocs/product/construction/sample/logical_design.md` に生成（WI-369 修正点） |
| 4 | `check-phase-gate` の blocker パス | scaffold 先と一致する |

## SC-09: CLI サーフェスの整合（WI-367 / WI-368）

| # | 操作 | 期待 |
|---|------|------|
| 1 | `KNOWN_HARNESS_COMMANDS` と main.ts の case 集合 | 集合一致（conformance テスト） |
| 2 | `templates --help` / `scaffold-inception --help` | exit 0 + 契約表示 |
| 3 | `phasegate --help` | 新コマンド 2 件が掲載される |
