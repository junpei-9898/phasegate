---
id: WI-122
type: issue
status: drafted
---

# WI-122 Unit Test Design

- `PointerRule.policyFor()` returns configured fail/warn/skip by semantic pointer type.
- Broken pointer output includes owner, semantic type, severity, source document, and next action.
- External URL pointers are skipped by default unless policy includes them.
- Related-source-change freshness returns `stale-after-source-change`.
