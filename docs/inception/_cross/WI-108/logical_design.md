# WI-108 Logical Design

<!-- @work-item-id WI-108 -->

## Contract

`phasegate:ci-check` represents the documented L2-L4 CI contract. It delegates to the validator-system full validator execution path and returns a JSON payload that shows every executed or skipped validator.

## Behavior

- L2, L3, and L4 validator results are all present in `data.validatorResults`.
- disabled L4 validators remain visible as `skipped: true`.
- a run that only executes L3 must not be reported as the full CI check.

