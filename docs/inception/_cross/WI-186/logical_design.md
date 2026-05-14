# WI-186 Logical Design

## Scope

Health surfaces must stop reporting false top-level pass when live layer validation has failed. Documentation must also make clear which commands are gates and which are informational.

## Design

- `phasegate:status` keeps its informational exit-code contract: fail status exits 0, error status exits 2.
- The top-level response status for `phasegate:status` is derived from enabled layer live states.
- Enabled layer live states `fail` or `error` make the response status `fail`; `pass`, `skipped`, and `not-run` do not by themselves fail status.
- `complete-check` remains the strict completion gate: all validators and lint must pass.
- `check-ready` remains the story/phase readiness gate.
- `validate --layer` remains the validator-system layer gate for the requested layer.

## Validation

- Unit regression fixes `phasegate:status` top-level status when live L1 fails.
- Command help/docs include a command coverage matrix for `status`, `complete-check`, `check-ready`, and `validate`.
