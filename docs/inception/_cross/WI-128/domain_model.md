---
id: WI-128
type: issue
status: drafted
---

# WI-128 Domain Model

| Concept | Owner | Meaning |
| --- | --- | --- |
| L4 scheduled audit | validator-system / ci-governance | Weekly operational validator run for slow drift. |
| L4 opt-in state | config-foundation | `layers.L4.enabled` and strict preset policy. |
| Compatibility command | phase2-extensions | `p2:*` command kept for existing users while L4 validator IDs are canonical. |
| Advisory warning | validator-system | L4 warning signal that may be non-blocking depending on preset / fail-on-warning policy. |

## Invariants

- L4-004 and L4-005 are registered validators.
- `validate --layer L4` is the canonical explicit L4 execution path.
- `p2:check-freshness` and `p2:validate-pointers` remain compatibility entry points.
- Default-off L4 is an operational rollout choice, not missing validator registration.

@work-item-id WI-128
