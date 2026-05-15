# WI-201 Domain Model

## Concepts

- **Config apply plan**: A `config:plan` result whose `configPatch.applicability` is `applicable` and whose operations can be applied by PhaseGate-owned code after user review.
- **Managed config apply**: A CLI mutation path that writes `phasegate.config.json` from a reviewed config plan, records rollback evidence, and does not require agent file-edit tools.
- **Retrofit bootstrap intent**: The existing relaxation intent that sets manual planning, enables phase dependency override, and relaxes the phase-gate quick-mode gate for retrofit adoption.
- **Config-specific hook guidance**: A full-mode block response for `phasegate.config.json` that points to the config plan/apply path instead of generic implementation design.

## Invariants

- `config:plan --apply` must only mutate when `configPatch.applicability = "applicable"`.
- Dry-run output remains non-mutating and remains the review contract for apply.
- Managed apply must preserve the same target, risk, validation, and rollback fields as dry-run.
- Hook protection for arbitrary `Edit` / `Write` calls remains intact; the approved mutation path is the CLI command, not a broad hook allowlist.
