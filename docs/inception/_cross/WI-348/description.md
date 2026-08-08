---
id: WI-348
type: fix
severity: critical
status: implemented
affects: [harness-api, agent-integration]
source: GitHub issue #41 症状③（Full Mode session を張ってもブロックが解けない）
---

# WI-348: Full Mode session の allowedCategories がレイヤー名語彙で書き出され session がほぼ無力化する問題の修正

<!-- @work-item-id WI-348 -->

## 背景

`phasegate session begin` が `.phasegate/session.json` に書き出す `allowedCategories` は
`["domain", "application", "infrastructure", "presentation", "config"]`（レイヤー名語彙）だった。

一方、照合相手の `dominantCategory` は quick-mode の `ChangeCategoryValue`
（`bugfix | docs | test | config | feature | domain | api`）であり、両者の交差は
`domain` / `config` の 2 語のみ。結果として Full Mode session を張っても
`feature` / `api` / `bugfix` 等の書き込みは `category X is not allowed by session` で
拒否され続け、session 機構が構造的にほぼ無力化していた（issue #41 症状③の主因）。

## 修正

1. `FULL_MODE_SESSION_ALLOWED_CATEGORIES` を ChangeCategory の全語彙に置換する。
   session のスコープ制御は unit / 期限 / target path 側の判定が担う。
2. 後方互換: `FileSystemFullModeSessionQueryAdapter` で、ChangeCategory 語彙に無い値を
   含む `allowedCategories`（= 旧形式の生成物）を全カテゴリ許可へ正規化する。
   全要素が既知カテゴリなら手編集による意図的な絞り込みとみなし原文を尊重する。
3. `docs/inception/_cross/WI-206/logical_design.md` の
   「Quick Mode 分類は domain/application/infrastructure を返す」という誤った前提を訂正する。
