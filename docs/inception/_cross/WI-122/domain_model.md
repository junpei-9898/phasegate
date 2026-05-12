---
id: WI-122
type: issue
status: drafted
---

# WI-122 Domain Model

## PointerRule

`PointerRule` now carries operational semantics:

- `owner`: responsible owner for broken pointer triage.
- `pointerPolicies`: per semantic pointer type policy (`fail`, `warn`, `skip`).

Semantic pointer types are `reference`, `implementation`, `adr`, `product-doc`, and `external-url`.

## FreshnessCheckResult

Freshness results classify docs as `stable` or `stale-after-source-change` and include `nextAction`.
