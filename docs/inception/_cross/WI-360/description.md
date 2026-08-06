---
id: WI-360
type: chore
severity: trivial
status: drafted
affects: [docs]
source: GitHub issue #46（WI-360 自身の description.md が欠落していた）
---

# WI-360: WI-352〜358 の description.md をバックフィルする

<!-- @work-item-id WI-360 -->

## 背景

issue #27 / #29 対応で投入した WI-352〜358 は `docs/inception/_cross/WI-XXX/description.md`
が未作成のまま残っており、同じ一連の作業である WI-348〜351（作成済み）と揃っていなかった。

`docs/inception/_cross/WI-XXX/description.md` は `quick-implementor` の
WI-aware trivial path が `type` frontmatter を参照する入口であり、欠けていると
後続作業がその WI を `fix` / `chore` / `story` のどれとして扱うべきか判定できない。

## 修正

WI-348〜351 の既存形式（frontmatter: `id` / `type` / `severity` / `status` / `affects` /
`source`、本文: 見出し + `@work-item-id` コメント + 背景 + 修正）に倣って 7 件を作成した。

| WI | type / severity | affects | 要旨 |
|---|---|---|---|
| WI-352 | fix / high | quick-mode | 直下 bootstrap 設定ファイルの config 分類 |
| WI-353 | fix / medium | config-foundation | 防御プリセットの `quickMode.allowedCategories` 整合 |
| WI-354 | fix / high | agent-integration | quick-mode 復旧案内をカテゴリから導出 |
| WI-355 | chore / medium | skills, docs | パスベース分類器と復旧経路の文書化 |
| WI-356 | fix / high | harness-error | Phase Gate 案内を到達可能な参照へ |
| WI-357 | fix / medium | validator-system | 復旧手順を `validate --layer L2` の出力へ |
| WI-358 | fix / medium | phase-dependency-model | QA 見出しの表記ゆれ受け入れ |

内容は各コミットメッセージと diff から要約したもので、新たな仕様判断は含まない。

## 本ファイル自体が後から作成された理由

WI-360 はバックフィル作業そのものであり、実施時に自身の description.md を作らないまま
コミットされた（バックフィル対象リストに自分が入っていなかった）。
issue #46 のチェックリストで指摘され、WI-366 で本ファイルを追加した。
記載内容は WI-360 のコミット `ede1ef5f` のメッセージと diff（7 ファイル新規作成）に基づく。
