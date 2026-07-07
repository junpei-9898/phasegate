---
id: WI-187
type: issue
severity: high
status: tested
affects: [installation]
source: github#12
external_ref: https://github.com/junpei-9898/phasegate/issues/12
---

# WI-187: Doctor suggests migrate work-items repair that makes no changes

> 起票日: 2026-05-14
> 起票経緯: GitHub Issue #12 の再現確認。

## 再現結果

一時 project に `docs/inception/_shared/**/*_plan.md` を 15 件配置し、WI directory は 0 件にした。

```text
$ phasegate doctor --json
"checkId": "wi-workflow-drift"
"message": "WI-first drift detected: 0 WI directories and 15 ad-hoc plan file(s)."
"repairMode": "mechanical"
"repairHint": "phasegate migrate work-items --apply"

$ phasegate migrate work-items --apply
WorkItem migration apply
applied: 0
skipped: 0
warnings: 0
blocked: no
```

## 問題

- doctor は mechanical repair として `migrate work-items --apply` を提示する。
- migration は `_shared` ad-hoc plan を候補にしないため、提示された repair は finding を解消しない。
- agent が repairHint を自動実行すると no-op ループになりうる。

## 受け入れ基準

- [x] `wi-workflow-drift` の repairHint は実際に drift を解消するか、解消不能なら `ai-assisted` / `null` になる。
- [x] `_shared` ad-hoc plan は migration 対象にせず、WI 採番・配置先・frontmatter が必要な manual classification として明示する。
- [x] doctor -> repairHint -> doctor rerun の regression test で no-op repair を検出する。
