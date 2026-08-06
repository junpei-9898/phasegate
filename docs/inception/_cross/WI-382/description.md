---
id: WI-382
type: fix
severity: trivial
status: drafted
affects: [traceability-model, docs]
source: work-items:status 実行時に毎回出ていた frontmatter スキップ警告 2 件
---

# WI-382: WI-360 / WI-366 の enum 外 severity を修正して frontmatter スキップ警告を解消する

<!-- @work-item-id WI-382 -->

## 背景

`docs/inception/_cross/WI-360/description.md` と
`docs/inception/_cross/WI-366/description.md` の frontmatter が
`severity: low` を宣言していた。`low` は `WORK_ITEM_SEVERITIES`
（`trivial` / `normal` / `medium` / `high` / `critical` / `major`）に含まれない。

WI-337 で `parseWorkItemFrontmatter` の enum 不一致はクラッシュではなく
警告付きスキップになっているため実害はクラッシュではないが、
`FileSystemWorkItemIdentityGateway` / `FileSystemWorkItemStatusGateway` が
この 2 件を WI 台帳から取りこぼした状態が常態化していた。

```
[phasegate] warning: docs/inception/_cross/WI-360/description.md をスキップしました: WorkItem frontmatter が不正です: severity 値が enum 外: low
[phasegate] warning: docs/inception/_cross/WI-366/description.md をスキップしました: WorkItem frontmatter が不正です: severity 値が enum 外: low
```

スキップされた WI は identity 照合（ディレクトリ名と frontmatter id の一致検査）と
status 導出の対象外になるため、台帳としての `_cross` の網羅性が欠ける。
また恒常的に出る警告は、本当に対処が要る警告を埋もれさせる。

## 修正

- WI-360 / WI-366 の `severity: low` を `severity: trivial` に修正する。
  両者とも description.md のバックフィルという純粋な台帳整備であり、
  enum 内で最も近い値は `trivial`。

`_cross` 配下の全 description.md の severity 値を棚卸しした結果、
enum 外の宣言はこの 2 件のみで、他は `trivial` / `normal` / `medium` /
`high` / `critical` / `major` に収まっている。

## 検証

`npx phasegate work-items:status --dry-run` の出力から
`をスキップしました` の警告が 2 件 → 0 件になること。
