---
traceability:
  initial_creation: true
---

# WI-187 Domain Model

<!-- @work-item-id WI-187 -->

## Doctor Finding Semantics

`DiagnosticFinding.repairMode` must describe whether the surfaced action can resolve the finding in the current command contract.

| Finding | Repair mode | Repair hint | Reason |
|---|---|---|---|
| `wi-workflow-drift` caused by ad-hoc plans with zero WI directories | `manual` | `null` | `migrate work-items --apply` only migrates recognized legacy issue/H-ID directories and cannot infer WI metadata for `_shared` plans. |

## Migration Boundary

`migrate work-items` remains limited to legacy work-item directories whose identity can be derived mechanically:

- `docs/inception/issues/ISSUE-XXX`
- `docs/inception/{unit}/issues/ISSUE-XXX`
- `docs/inception/{unit}/HNN-NN`

Plain `_shared/**/*_plan.md` files are planning notes, not work-item directories. They require manual classification before they can become WI artifacts.
