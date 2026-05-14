---
traceability:
  initial_creation: true
---

# WI-187 Logical Design

<!-- @work-item-id WI-187 -->

## Decision

`wi-workflow-drift` detects `_shared` or other ad-hoc inception plans without WI directories. Those files are not valid inputs for `migrate work-items --apply`, because assigning a WI id, owner unit, type, severity, and frontmatter requires project intent.

Therefore doctor must not expose `phasegate migrate work-items --apply` as a mechanical `repairHint` for this finding. The finding remains red because the project is still outside WI-first workflow, but its repair contract becomes manual:

- `repairMode: "manual"`
- `repairHint: null`
- `suggestedSkill: null`

## Flow

1. `WiWorkflowDriftCheck` scans `docs/inception`.
2. If there are no `WI-XXX/description.md` files and at least one ad-hoc plan, it emits a red manual finding.
3. JSON and human doctor output preserve the diagnostic message but do not include a copy-paste fix line.
4. Regression coverage builds a downstream-style fixture, runs doctor, runs `migrate work-items --apply`, then reruns doctor. Because migration applies zero candidates and the finding remains, the test asserts doctor did not provide the no-op repair hint.

## Non-goals

WI-187 does not migrate `_shared` ad-hoc plans automatically. A future work item may add an explicit scaffold flow that asks for unit/scope/type metadata before creating WI directories.
