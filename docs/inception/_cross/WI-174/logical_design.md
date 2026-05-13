---
traceability:
  initial_creation: true
---

# WI-174 Logical Design

## Objective

Make `AGENTS.md` and `CLAUDE.md` PhaseGate managed setup targets without destroying user-owned content.

## Design

- Add bundled templates under `docs/templates/agent-context/`.
- Add a markdown managed strategy to install/reconcile/uninstall.
- Render setup options into the managed section.
- Keep `AGENTS.md` lesson pointers in a dedicated marker section owned by ci-governance.
- Treat `AGENT.md` singular as unsupported/user-owned.

## Product Reflection

Installation, ci-governance, agent-integration, documentation, and setup artifact docs contain `@work-item-id WI-174`.
