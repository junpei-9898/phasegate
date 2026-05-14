# WI-193 Domain Model

## Concepts

- **WI workflow drift**: A repository state with no WI directories but with ad-hoc inception planning files.
- **Ad-hoc plan candidate**: Any markdown file under `docs/inception/_shared/**`, plus legacy `_plan.md` and `codding_plan` files outside WI directories.

## Invariants

- `_shared/**/*.md` is counted recursively.
- `WI-XXX` directories are excluded.
- Drift remains manually repairable with `repairHint: null`.
