---
traceability:
  initial_creation: true
---

# WI-176 Integration Test Design

<!-- @work-item-id WI-176 -->

## CLI Tests

| Case ID | Command | Fixture | Expectation |
|---|---|---|---|
| IT-WI176-001 | `setup:agent --intent strict --with-ci --with-husky --dry-run --json` | empty temp project | `plan.agentReadiness` includes planned `claude`, planned `codex`, and planned `shared` rows |
| IT-WI176-002 | `setup:agent --agent claude --intent strict --with-husky --dry-run --json` | empty temp project | Claude row is planned, Codex row is not-applicable, shared row is planned |
| IT-WI176-003 | `setup:agent --intent strict --with-ci --with-husky --apply --json` then dry-run | temp project | all selected agent readiness rows are configured |

## Dogfood Tests

Registry dogfood after publish must verify:

- `setup:agent --agent claude --intent strict --with-ci --with-husky --apply --json` creates Claude managed targets.
- Re-running `setup:agent --agent both ... --dry-run --json` separates Claude, Codex, and shared readiness.
- Claude managed context points an agent to readiness, manual actions, and validation commands.
