---
traceability:
  initial_creation: true
---

# WI-172 Logical Design

## Objective

Provide an agent-readable setup orchestrator that detects repository setup state, asks only missing questions, and can optionally apply the structured install path.

## Design

`phasegate setup:agent` accepts:

- `--intent minimal|recommended|strict|ci-only|agent-hooks|retrofit`
- `--agent claude|codex|both`
- `--workflow standard|strict`
- `--with-husky`, `--with-ci`
- `--dry-run`, `--apply`, `--json`

The dry-run JSON payload contains detected files, questions, changes, risks, rollback, and validation commands. `--apply` delegates writes to `RunInstallUseCase` so setup orchestration does not own merge rules.

## Product Reflection

Installation logical design and coverage report contain `@work-item-id WI-172`.
