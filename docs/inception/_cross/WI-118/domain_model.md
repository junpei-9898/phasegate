---
id: WI-118
type: issue
status: drafted
---

# WI-118 Domain Model

## Consistency Target

Consistency targets are derived from real product docs:

- layer annotations: known layer vocabulary.
- Unit annotations: annotation must match the owning construction Unit.
- ADR references: referenced ADR must exist.
- work item annotations: current `@work-item-id` and legacy annotations are read without mixed-mode false positives.

## MismatchPair

`MismatchPair` includes `location`, `expected`, `actual`, and optional `nextAction`.
