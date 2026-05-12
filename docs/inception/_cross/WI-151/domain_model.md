# WI-151 Domain Model: Status and Drift Terms

@work-item-id WI-151

## Concepts

| Concept | Meaning |
|---|---|
| Configuration state | Whether config enables or disables a layer/check. |
| Cached artifact state | Whether a report or derived artifact exists for later inspection. |
| Live validation state | Current execution result used for gate decisions. |
| Missing | Expected input, product doc, pointer, report, or code evidence is absent. |
| Limitation | Detector coverage cannot prove the condition; the finding should remain advisory. |
| Warning strictness | `validate.failOnWarning`, strict preset behavior, or `--fail-on-warning`. |

## Invariants

- CI and agents must not treat cached artifact absence as live validation failure.
- Disabled L4 in aggregate execution is skipped, not failed.
- Explicit `validate --layer L4` is an operator request to run scheduled checks on demand.
- L2-013 must appear in the layer guide validator table.

