---
id: WI-196
type: issue
severity: normal
status: drafted
affects: [harness-api, agent-integration]
source: github#21
external_ref: https://github.com/junpei-9898/phasegate/issues/21
---

# WI-196: delegate-sonnet help advertises positional args that the parser rejects

> 起票日: 2026-05-14
> 起票経緯: GitHub Issue #21。WI-189 follow-up。`delegate-sonnet --help` は `[...args]` を表示するが positional arg が `Unknown option` になる。

## 問題

`delegate-sonnet --help` は forwarded positional args を public contract として示す一方、実行時の option parser は non-option token を unknown option として拒否する。

## 再現概要

```text
$ npx phasegate delegate-sonnet --help
Usage: phasegate delegate-sonnet [...args]

$ npx phasegate delegate-sonnet "test task"
Unknown option: test task
```

## 影響

- help と runtime behavior が矛盾する。
- delegated task text を CLI から渡せず、command の主用途が成立しない。

## 受け入れ基準

- [ ] `delegate-sonnet "task text"` または明示した passthrough form が documented contract 通りに動く。
- [ ] parser が forwarded args と phasegate-owned options の境界を明確に扱う。
- [ ] `delegate-sonnet --help` と main help が実際の invocation form と一致する。
- [ ] e2e / integration test が positional forwarding または `--` passthrough を検証する。
