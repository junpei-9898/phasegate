# WI-158 Domain Model: Report Path Terms

@work-item-id WI-158

## Concepts

| Concept | Meaning |
|---|---|
| Configured report root | `reporting.outputDir`, defaulting to `reports`. |
| Explicit report path | A path supplied directly to a command, such as `doctor --report-out <path>`. |
| Fixed producer path | A path owned by a command/unit and not currently configurable via `reporting.outputDir`. |
| Legacy fallback | `.harness/reports`, used only where config resolution is unavailable. |
| Stdout report | JSON emitted to stdout and persisted only if the caller redirects it. |

## Invariants

- `reporting.outputDir` must not be documented as a universal output sink.
- Doctor output must be described as explicit-path output.
- Regression-suite output must be described as fixed `reports/regression/`.
- Status and drift JSON must be described as stdout output.

