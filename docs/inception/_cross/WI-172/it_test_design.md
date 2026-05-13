---
traceability:
  initial_creation: true
---

# WI-172 Test Design

## Checks

- `setup:agent --dry-run --json` exits 0 and emits detected setup state.
- `setup:agent --intent strict --with-ci --with-husky --dry-run --json` includes strict rollout changes and validation commands.
- `setup:agent --apply --json` delegates to structured install and reports the install result.
- Public guides explain dry-run / apply / rollback / validation semantics.
