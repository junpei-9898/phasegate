# WI-107 Logical Design

<!-- @work-item-id WI-107 -->

## Policy

L4 validators are advisory by default. Explicit L4 execution still runs the validators, but warning findings only affect the exit code when warning escalation is enabled by CLI or config. `validate --layer all` includes disabled L4 validators as skipped results instead of pretending they ran.

## Command Alignment

- `validate --layer L4` and `phasegate:detect-drift` share the same advisory semantics.
- `--fail-on-warning` is an explicit CLI override and wins over config defaults.
- disabled L4 under `all` is represented as skip output and is not counted as a warning failure.

