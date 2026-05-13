---
traceability:
  initial_creation: true
---

# WI-174 Test Design

## Checks

- Install creates or merges selected `AGENTS.md` / `CLAUDE.md` files.
- Existing user content outside managed markers is preserved.
- Reconcile updates only the managed section.
- Uninstall removes only the managed section for merged files.
- `ci:auto-refresh-agent-context` updates only the AGENTS lesson pointer section.
