---
id: WI-387
type: fix
status: implemented
severity: high
source: fresh install dangling Claude hooks
---

# WI-387: Claude hook scripts を managed install target に追加する

<!-- @work-item-id WI-387 -->

## 問題

`templates/.claude/settings.json` は `.claude/scripts/` の 4 hook script を参照するが、
install target に scripts が無いため fresh install が dangling hook を生成する。

## 修正

- 既存の `templates/.claude/scripts/` 5 files（4 scripts + `hook-config.json`）を、
  Claude hook を選択した project/personal install の managed target に追加する。
- install/reconcile manifest で created file として追跡し、reconcile で欠落・version drift を
  復元し、uninstall で未改変ファイルを削除する。
- 4 script は executable mode を設定する。

