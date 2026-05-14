---
id: WI-193
type: issue
severity: normal
status: tested
affects: [installation, traceability-model]
source: github#18
external_ref: https://github.com/junpei-9898/phasegate/issues/18
---

# WI-193: Doctor undercounts ad-hoc plan files in wi-workflow-drift

> 起票日: 2026-05-14
> 起票経緯: GitHub Issue #18。WI-187 follow-up。`repairHint` は修正済みだが、`wi-workflow-drift` の file count が実ファイル数より小さく出る。

## 問題

`doctor --json` の `wi-workflow-drift` finding が、`docs/inception/_shared/` 配下に 15 件以上の markdown がある状態で `2 ad-hoc plan file(s)` と報告する。

## 再現概要

```text
$ find docs/inception/_shared -maxdepth 4 -name "*.md" | wc -l
15

$ npx phasegate doctor --json
"WI-first drift detected: 0 WI directories and 2 ad-hoc plan file(s)."
```

## 影響

- drift の規模を過小評価させる。
- 将来の migration / classification 実装で同じ walker を使う場合のリスクになる。

## 受け入れ基準

- [ ] `wi-workflow-drift` が `_shared` 配下の markdown plan candidates を再帰的に数える。
- [ ] count 対象と除外対象が domain contract として明示される。
- [ ] nested directory と top-level file が混在する fixture の regression test がある。
- [ ] `repairHint` は WI-187 の通り `null` のまま維持される。
