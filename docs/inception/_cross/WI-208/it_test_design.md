# WI-208 Integration Test Design

<!-- @work-item-id WI-208 -->

| Case ID | Flow | Expectation |
|---|---|---|
| IT-WI208-INS-001 | `phasegate install --personal --agent claude --apply` in a team repository | Team-owned files remain byte-identical. |
| IT-WI208-INS-002 | Same flow | `.phasegate-local/phasegate.config.json`, `.phasegate-local/claude/settings.json`, `.phasegate-local/skills`, `.claude/settings.json` shim, and `.claude/skills` shim exist. |
| IT-WI208-INS-003 | Same flow | `.git/info/exclude` contains a managed block that hides `.phasegate-local/`, `.phasegate/`, `.claude/`, `.codex/`, `skills/`, and root `phasegate.config.json`. |
| IT-WI208-INS-004 | Existing non-PhaseGate `.claude/settings.json` | Apply refuses or reports manual review without overwriting existing content. |
| IT-WI208-CFG-001 | Run `phasegate validate --layer L2` with no root `phasegate.config.json` but with `.phasegate-local/phasegate.config.json` | Command resolves personal config fallback and reports the source. |
| IT-WI208-UNINS-001 | `phasegate uninstall --apply` after personal Claude install | Personal sandbox and root shim are removed; team-owned files remain byte-identical. |

## Local Verification Evidence

<!-- @work-item-id WI-208 -->

2026-05-21 local dogfood used the workspace CLI version `0.160.14` in `/private/tmp/phasegate-wi208-local-WJpDHN`.

| Check | Command | Result |
|---|---|---|
| Personal Claude apply | `tsx scripts/harness/main.ts install --personal --agent claude --apply --json` | Created `.phasegate-local/phasegate.config.json`, `.phasegate-local/claude/settings.json`, `.phasegate-local/skills`, `.claude/settings.json`, `.claude/skills`, `.git/info/exclude`, and manifest entries. |
| Config fallback | `tsx scripts/harness/main.ts validate --layer L2 --format human` from a project with no root `phasegate.config.json` | PASS; validators loaded `.phasegate-local/phasegate.config.json` fallback. |
| Doctor personal scope | `tsx scripts/harness/main.ts doctor --agent claude --json` | `scope.installationMode` was `personal`, `overallStatus` was `green`, and team/project package, Husky, CI, and Codex findings were scoped out. |
| Uninstall | `tsx scripts/harness/main.ts uninstall --apply --json` | Removed personal sandbox and root `.claude` shims, archived manifest, and left only `.phasegate/uninstalled-*.json`. |
| IT-WI208-UNINS-002 | Same uninstall flow | `.git/info/exclude` keeps user lines and removes only the PhaseGate managed block. |
