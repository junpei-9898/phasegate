---
id: WI-139
type: issue
status: drafted
---

# WI-139 Logical Design

`SemanticDriftService` performs an upper-level semantic comparison above L4-001 structural drift:

- design behavior missing code => error.
- design behavior missing test => warning.
- public code behavior missing design => warning.
- public code behavior missing test => warning.
- test observation missing design => warning.

Private/internal implementation behavior is not reported by semantic drift.
