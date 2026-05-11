---
traceability:
  initial_creation: true
work_item: WI-146
---

# Integration Test Design: WI-146

@work-item-id WI-146

| ID | Command | Fixture | Expected |
|---|---|---|---|
| IT-WI146-CLI-001 | `phasegate install --dry-run` | Empty temp project | Lists target actions and writes no files |
| IT-WI146-CLI-002 | `phasegate install --apply` | Existing `.claude/settings.json` and `.codex/hooks.json` | Hooks are merged, existing entries retained, manifest saved |
| IT-WI146-CLI-003 | `phasegate install --apply` twice | Temp project after first install | Target hashes and manifest hashes do not change |
| IT-WI146-CLI-004 | `phasegate install --apply` | Existing custom Husky script | Refuses ai-assisted merge and prints skill hint |
| IT-WI146-CLI-005 | `phasegate install --force` | Existing custom Husky script | Merges with backup under `.phasegate/backups/` |
| IT-WI146-CLI-006 | `phasegate doctor` after install | Installed temp project | Reports green for install-managed targets |

## Verification Commands

@work-item-id WI-146

- `pnpm exec vitest run scripts/harness/__tests__/unit/installation`
- `pnpm exec vitest run scripts/harness/__tests__/integration/installation`
- `pnpm harness:check-ready`
