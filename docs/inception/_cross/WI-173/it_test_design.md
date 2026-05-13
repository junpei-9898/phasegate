---
traceability:
  initial_creation: true
---

# WI-173 Test Design

## Checks

- `config:plan --intent codex-hooks --json` lists `.codex/hooks.json`, `AGENTS.md`, user-level Codex enablement, and validation commands.
- `config:plan --intent l4-strict --json` lists L4 config fields and warning-as-failure validation.
- Public recipes explain how to use the plan before applying a diff.
