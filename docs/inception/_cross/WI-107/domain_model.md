# WI-107 Domain Model

<!-- @work-item-id WI-107 -->

| Concept | Responsibility |
|---|---|
| L4 advisory result | Drift/consistency/dead-code signal that can be reported without failing default commands |
| Warning escalation | Policy that converts warnings into command failure |
| Skipped validator | Disabled validator that is visible in aggregate output but not executed |

## Invariants

- A skipped L4 validator is not a pass-by-execution; it is a visible skip.
- Warning escalation is opt-in by CLI/config and must be applied consistently across L4 paths.
- `all` validation must not hide disabled scheduled validators.

