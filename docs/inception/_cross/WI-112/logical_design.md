# WI-112 Logical Design

## Scope

`phasegate:status` is an informational command. It keeps exit code 0 when it can render the current state, while separating configuration state, cached artifact state, and live validation state.

## Design

`harness-api` owns status derivation and response formatting. `LayerHealth` carries `configurationState`, `cachedArtifactState`, and `liveValidationState` in addition to the backward compatible `lastResult` summary. `StatusDerivationService` prefers live pass/fail results for `lastResult`, then falls back to cached artifact state.

`validator-system` remains the source of live validation results. Status reports validator failures as layer health instead of converting them into command failure.

## Exit Code Contract

`phasegate:status` returns exit code 0 for pass/fail/unknown health states because those states are valid report data. Execution errors still use execution error semantics.

