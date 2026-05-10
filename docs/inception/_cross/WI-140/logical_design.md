# WI-140 Logical Design

<!-- @work-item-id WI-140 -->

WI status derivation becomes a standard gate by adding `L2-014 work-item-status-staleness` to `validator-system`. The validator reuses the traceability-model status report instead of reimplementing evidence scanning.

## Flow

1. `validate --layer L2` selects `L2-014` with the other L2 validators.
2. `RunL2ValidatorsUseCase` asks a `WorkItemStatusPolicyPort` for stale reports.
3. The traceability adapter derives reports through `traceability-model` and returns reports whose `currentStatus !== derivedStatus`.
4. Any stale report becomes a failing `L2-014` error with the structured missing evidence attached to the error object.

## Policy

- Local `work-items:status --dry-run` remains advisory unless `--fail-on-stale` is supplied.
- Standard L2 validation fails on stale status for WI reports connected to the validation target paths, because pre-commit and CI consume L2 as a changed-artifact gate.
- `work-items:status --apply` never downgrades a WI by default. Downgrade requires `--allow-downgrade`.
- `--changed-only` can be supplied to apply mode as an explicit no-op compatible policy flag until staged-file scoping is implemented.

## Green Evidence

`tested` is only trustworthy when no blocking validation is known for the WI. `WorkItemStatusReport.evidence.validation` records whether validation is `passed`, `failed`, or `not-run`. The L2 gate is the green evidence source used by CI; a failing `L2-014` report prevents stale `tested` frontmatter from being accepted.
