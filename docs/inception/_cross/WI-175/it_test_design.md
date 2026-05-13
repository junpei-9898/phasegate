---
traceability:
  initial_creation: true
---

# WI-175 Integration Test Design

<!-- @work-item-id WI-175 -->

## CLI Scenarios

| ID | Command | Fixture | Expected |
|---|---|---|---|
| IT-WI175-001 | `setup:agent --intent strict --with-ci --with-husky --dry-run --json` | empty temp project | JSON includes completeness for config, agent context, hooks, CI, validation, and external actions |
| IT-WI175-002 | `setup:agent --intent strict --with-ci --with-husky --apply --json` repeated | empty temp project | second run reports managed targets as already up to date |
| IT-WI175-003 | `config:plan --intent l4-strict --json` | empty temp project | JSON includes a concrete `phasegate.config.json` patch preview |
| IT-WI175-004 | `config:plan --intent codex-hooks --json` | empty temp project | managed targets and external actions are separate |
| IT-WI175-005 | install apply with denied target | filesystem adapter or temp permission fixture | structured target-aware error is returned |

## Dogfood Scenario

After publish, install the published package into a temporary project and run:

1. `phasegate setup:agent --intent strict --with-ci --with-husky --apply --json`
2. repeat the same setup command and confirm no managed drift
3. `phasegate config:plan --intent l4-strict --json`
4. `phasegate config:plan --intent codex-hooks --json`
5. `phasegate doctor --json`
6. `phasegate uninstall --apply --json`

The dogfood report must describe whether the completeness summary makes remaining manual actions clear.
