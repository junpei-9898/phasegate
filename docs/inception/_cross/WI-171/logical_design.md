---
traceability:
  initial_creation: true
---

# WI-171 Logical Design

## Objective

First-time users need a route from README to the next command and success state without reading the whole CLI catalog.

## Design

- Add `docs/guide/getting-started.md` as the first-run entry point.
- Add `docs/guide/recipes.md` for first-run, retrofit, agent-hook, CI, strict L4, and config-change workflows.
- Add `docs/guide/troubleshooting.md` to explain `doctor` findings, `repairHint`, `suggestedSkill`, and refused managed targets.
- Link these guides from README and keep CLI catalog details in `docs/guide/cli-reference.md`.

## Product Reflection

Public documentation reflection is in `docs/product/construction/documentation/coverage_report.md` with `@work-item-id WI-171`.
