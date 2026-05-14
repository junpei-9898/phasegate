# WI-191 Domain Model

## Concepts

- **Planning mode**: The mode that determines whether PhaseGate requires QA-section evidence from plan documents.
- **Manual planning mode**: A retrofit-only mode where plan evidence is treated as externally reviewed and PhaseGate does not require QA markers.
- **Config change plan**: A read-only JSON plan containing patch operations, commands, validations, risks, and rollback notes.

## Invariants

- `manual` is valid anywhere `planningMode.default` or `planningMode.perPhase` accepts a mode.
- `config:plan` emits reviewable patch data and does not mutate `phasegate.config.json`.
