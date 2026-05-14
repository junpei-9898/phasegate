# WI-186 Domain Model

## Concepts

| Concept | Responsibility |
| --- | --- |
| Live validation state | Current run signal for each layer: `pass`, `fail`, `skipped`, `not-run`, or `error`. |
| Layer health | Combines configuration state, cached artifact state, and live validation state. |
| Status verdict | Informational health verdict derived from enabled layer live states. |
| Gate command | A command whose non-zero exit code blocks CI/agent completion. |

## Invariants

- Enabled layer `lastResult` must not contradict its live fail/error state.
- Informational `phasegate:status` may return exit code 0 for `status=fail`, but the JSON `status` must still be `fail`.
- Gate commands use exit code 1 for actionable failure and 2 for command/runtime error.
