# WI-140 Unit Test Design

<!-- @work-item-id WI-140 -->

## Unit Tests

- `WorkItemStatusDerivationService` includes missing artifacts, missing implementation, missing tests, and validation state in report evidence.
- `ApplyWorkItemStatusUseCase` blocks downgrades by default.
- `ApplyWorkItemStatusUseCase` allows downgrades with `allowDowngrade: true`.
- `WorkItemStatusCommandHandler` passes `--allow-downgrade` and `--changed-only` policy options to apply mode.
- `RunL2ValidatorsUseCase` returns a failing `L2-014` result when the status policy port reports stale WI statuses.
- `RunL2ValidatorsUseCase` returns a passing `L2-014` result when no stale reports exist.

## Integration Tests

- `validate --layer L2 --format ci` exposes `L2-014` as a CI-consumable fail signal.
- `work-items:status --dry-run --json` exposes structured missing evidence for each report.
