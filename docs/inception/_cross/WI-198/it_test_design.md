# WI-198 IT Test Design

## Cases

| ID | Scenario | Setup | Expected |
|---|---|---|---|
| IT-WI198-001 | refresh after install is reconcile-idempotent | temp project → `install --apply --force` → `ci:auto-refresh-agent-context --apply` → `reconcile --dry-run --json` | CLAUDE.md, AGENTS.md, package.json, hooks, workflow entries are `changed:false`. |
| IT-WI198-002 | CLAUDE user section is preserved | CLAUDE.md has user-owned section outside managed markers | refresh + reconcile preserve user content and report no managed-section oscillation. |
| IT-WI198-003 | AGENTS managed section no-op | AGENTS.md already refreshed | reconcile does not rewrite AGENTS.md for formatting-only differences. |
| IT-WI198-004 | package.json not touched by refresh | package.json installed state | refresh does not cause subsequent reconcile package-json update. |

## Dogfood Command

Use a temp project rooted outside the repo to avoid mutating the developer checkout.

```text
phasegate install --apply --force --json
phasegate ci:auto-refresh-agent-context --apply --json
phasegate reconcile --dry-run --json
```
