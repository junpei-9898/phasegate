---
id: WI-198
type: issue
severity: high
status: tested
affects: [ci-governance, installation]
source: github#23
external_ref: https://github.com/junpei-9898/phasegate/issues/23
---

# WI-198: Make agent-context refresh and reconcile idempotent

> 起票日: 2026-05-15
> 起票経緯: GitHub Issue #23。v0.160.6 dogfood で `ci:auto-refresh-agent-context --apply` 直後の `reconcile --dry-run` が差分を計画することを確認。

## 問題

`ci:auto-refresh-agent-context` と `reconcile` が同じ managed target を別々の canonical renderer で扱っているため、refresh apply 直後でも reconcile が update を計画する。operator はどちらの command を正とすべきか判断できず、CI auto PR が自己差分を作り続ける可能性がある。

## Dogfood 再現

検証用一時コピー `/private/tmp/phasegate-issue-dogfood/repo23` で実施。

```text
$ phasegate install --apply --force --json
[exit 0]

$ phasegate ci:auto-refresh-agent-context --apply --json
{"success":true,"applied":true,"claudeMd":{"changed":true,...}}
[exit 0]

$ phasegate reconcile --dry-run --json
CLAUDE.md -> update, changed: true
package.json -> update, changed: true
```

Issue 本文は `AGENTS.md` なども divergent としているが、現 checkout の dogfood では `AGENTS.md` は `changed:false`、`CLAUDE.md` と `package.json` で非冪等性を確認した。

## 影響

- `auto-refresh` と `reconcile` を連続実行する運用で不要差分が残る。
- managed-section の source of truth が command ごとに分岐している。
- hash / manifest 比較が apply 済み状態を正しく no-op と判定できない。

## 受け入れ基準

- [x] `ci:auto-refresh-agent-context --apply` 直後の `reconcile --dry-run --json` が対象 managed files を `changed:false` と判定する。
- [x] CLAUDE.md / AGENTS.md の renderer または canonical comparison が単一 source of truth を共有する。
- [x] package.json の install/reconcile metadata が refresh 後に不要 update されない。
- [x] cross-unit integration test が install → auto-refresh apply → reconcile dry-run の no-op を検証する。

## Verification

- `pnpm exec vitest run --config scripts/harness/__tests__/vitest.config.ts integration/installation/reconcile-handler.test.ts integration/ci-governance/refresh-agent-context-usecase.test.ts integration/installation/install-handler.test.ts`
- `pnpm test`
- `pnpm harness:check-ready`

## Post-publish Dogfood

2026-05-15 に published `phasegate@0.160.7` から取得した tarball を展開し、`/private/tmp/phasegate-wi197-200-dogfood/proj-refresh` で検証した。

- `phasegate install --apply --force --agent both --with-ci --with-husky --json` -> exit 0。
- `phasegate ci:auto-refresh-agent-context --apply --json` -> exit 0、`success:true`。
- `phasegate reconcile --dry-run --json` -> exit 0、`AGENTS.md` / `CLAUDE.md` / `package.json` はすべて `changed:false` で、refresh 直後の不要差分なし。
