---
id: WI-197
type: issue
severity: high
status: tested
source: github#22
external_ref: https://github.com/junpei-9898/phasegate/issues/22
---

# WI-197: Restore legacy health-check aliases

> 起票日: 2026-05-15
> 起票経緯: GitHub Issue #22。v0.160.6 dogfood で `status` / `complete-check` の unprefixed aliases が `Unknown command` になることを確認。

## 問題

`phasegate:status` と `phasegate:complete-check` へ namespace を統一した際、既存の `status` / `complete-check` aliases が削除された。既存 README、CI、hook、AGENTS.md、CLAUDE.md 由来の旧 invocation が exit 2 で失敗する。

## Dogfood 再現

```text
$ pnpm exec tsx scripts/harness/main.ts status
Unknown command: status
[exit 2]

$ pnpm exec tsx scripts/harness/main.ts complete-check
Unknown command: complete-check
[exit 2]

$ pnpm exec tsx scripts/harness/main.ts phasegate:status --json
{"status":"fail", ...}
[exit 0]
```

## 影響

- v0.160.6 以前の scripts / Makefile / CI workflow が移行案内なしで壊れる。
- full help dump は noisy だが migration path を示さない。
- public docs 上の旧 command 参照が残っている場合、ユーザーは原因を切り分けづらい。

## 受け入れ基準

- [x] `phasegate status` は `phasegate phasegate:status` と同じ status handler を実行し、command error では exit 2 にならない。
- [x] `phasegate complete-check` は `phasegate phasegate:complete-check` と同じ gate handler を実行する。
- [x] 旧 alias 使用時は stderr または structured warning で新 command 名を案内する。
- [x] e2e test が旧 alias と新 namespaced command の両方を検証する。

## Verification

- `pnpm exec vitest run scripts/harness/__tests__/e2e/cli-harness.test.ts -t "legacy|ci:generate-template --kind|ci:generate-template --output"`
- `pnpm test`
- `pnpm harness:check-ready`
