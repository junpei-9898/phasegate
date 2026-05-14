---
id: WI-195
type: issue
severity: normal
status: tested
affects: [harness-api, traceability-model]
source: github#20
external_ref: https://github.com/junpei-9898/phasegate/issues/20
---

# WI-195: migrate work-items remains hidden from public help

> 起票日: 2026-05-14
> 起票経緯: GitHub Issue #20。`migrate work-items` は invocable だが main `--help` には config schema migration しか載っていない。

## 問題

`phasegate migrate work-items --apply` は実行可能な subcommand として残っているが、public help surface では `migrate` の config schema migration だけが説明される。command を残すなら help に載せる必要があり、deprecated / unimplemented なら削除または明示が必要。

## 再現概要

```text
$ npx phasegate --help | grep -E 'check-change-category|migrate'
migrate                      Migrate phasegate.config.json (--schema v3, --config <path>)
check-change-category        Classify changed paths for quick mode

$ npx phasegate migrate work-items --apply
WorkItem migration apply
applied: 0
skipped: 0
warnings: 0
blocked: no
```

## 影響

- doctor / migration 周辺の public contract が曖昧になる。
- no-op 実装の扱いが hidden command として残るため、ユーザーが発見した時に信頼性を損なう。

## 受け入れ基準

- [ ] `migrate work-items` を正式 command として main help / command help に載せる、または deprecated command として明示する。
- [ ] help text が `--dry-run|--apply` と現在の migration 対象範囲を説明する。
- [ ] `doctor` の `repairHint` contract と矛盾しない。
- [ ] CLI e2e test が help surface を検証する。
