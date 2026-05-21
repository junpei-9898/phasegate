# WI-207 Integration Test Design

## Regression Coverage

| Case ID | Flow | Expectation |
|---|---|---|
| IT-WI207-INS-001 | `phasegate install --personal --apply` against a project containing team-owned files | Plan excludes `package.json`, `AGENTS.md`, `CLAUDE.md`, `.husky/*`, `.github/workflows/*`, and `.gitignore`; apply leaves their bytes unchanged. |
| IT-WI207-INS-002 | Same flow | `.phasegate-local/config.json` is created, `.git/info/exclude` receives a managed personal block, and `.phasegate/manifest.json` records the personal artifacts. |
| IT-WI207-UNINS-001 | `phasegate uninstall --apply` after personal install | `.phasegate-local/config.json` is removed and `.git/info/exclude` keeps user local exclude lines while losing the PhaseGate block. |
| IT-WI207-UNINS-002 | Same uninstall flow | Team-owned file bytes remain unchanged. |

## Published Package Dogfood Evidence

<!-- @work-item-id WI-207 -->

2026-05-21 dogfood used the published npm package `phasegate@0.160.13` in `/private/tmp/phasegate-wi207-dogfood-zHsKRO`.

| Step | Command | Evidence |
|---|---|---|
| Registry check | `npm view phasegate@0.160.13 version` and `npm view phasegate dist-tags --json` | Registry returned `0.160.13`; `latest` was `0.160.13`. |
| Dry run | `npx phasegate@0.160.13 install --personal --dry-run --json` | Plan contained only `.phasegate-local/config.json`, `.git/info/exclude`, and manual `~/.codex/hooks.json`; `refused` was empty. |
| Apply | `npx phasegate@0.160.13 install --personal --apply --json` | Changed only `.phasegate-local/config.json` and `.git/info/exclude`; user-level Codex hooks were reported as manual. |
| Team file hash check | Node SHA-256 verification after apply | `package.json`, `AGENTS.md`, `CLAUDE.md`, `.husky/pre-commit`, `.husky/commit-msg`, `.husky/pre-push`, `.github/workflows/phasegate-aidlc-gate.yml`, and `.gitignore` were byte-identical to the pre-install hashes. |
| Local exclude check | Node content verification after apply | `.git/info/exclude` preserved `team-local.tmp` and added the PhaseGate personal managed block. |
| Uninstall | `npx phasegate@0.160.13 uninstall --apply --json` | Deleted `.phasegate-local/config.json`, reverse-merged `.git/info/exclude`, and archived the manifest under `.phasegate/uninstalled-2026-05-21T09-21-56-345Z.json`. |
| Post-uninstall hash check | Node SHA-256 verification after uninstall | All team-owned files and `.git/info/exclude` returned to their original hashes; `.phasegate-local/config.json` was absent and the managed block was removed. |
