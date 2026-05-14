---
id: WI-190
type: issue
severity: normal
status: drafted
affects: [installation, ci-governance]
source: github#14
external_ref: https://github.com/junpei-9898/phasegate/issues/14
---

# WI-190: Reconcile and agent context auto-refresh disagree on managed sections

> 起票日: 2026-05-14
> 起票経緯: GitHub Issue #14。`ci:auto-refresh-agent-context --apply` 後に `reconcile --dry-run` が `CLAUDE.md` / `AGENTS.md` の drift を報告する。

## 問題

`ci:auto-refresh-agent-context` と `reconcile` が同じ managed section を別々の generator で生成しているため、片方の command を実行した直後にもう片方が更新差分を検出する。

## 再現概要

```text
$ npx phasegate ci:auto-refresh-agent-context --apply --json
$ npx phasegate reconcile --dry-run --json
CLAUDE.md: update managed portion (~3127 bytes -> 2393 bytes)
AGENTS.md: update managed portion (~1595 bytes -> 1645 bytes)
```

## 影響

- refresh と reconcile の往復で phantom drift が発生する。
- manifest hash と on-disk content が安定しない。
- `phasegate-config-doctor` への不要な誘導が発生する。

## 受け入れ基準

- [ ] `ci:auto-refresh-agent-context --apply` 後の `reconcile --dry-run --json` が `changed: true` を出さない。
- [ ] managed section の生成責務が 1 箇所に集約される、または両 command が同じ serializer を使う。
- [ ] AGENTS.md / CLAUDE.md の user-owned content は保持される。
- [ ] regression test が auto-refresh -> reconcile の idempotency を検証する。
