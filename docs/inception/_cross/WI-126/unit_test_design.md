# WI-126 Unit Test Design

<!-- @work-item-id WI-126 -->

## Unit Tests

- `WorkItemStatusDerivationService` returns `reflected` when every affected unit has product reflection.
- `WorkItemStatusDerivationService` returns `tested` for story/issue/refactor when test evidence exists.
- `WorkItemStatusDerivationService` returns `implemented` for fix without requiring test evidence.
- `WorkItemStatusCommandHandler` returns exit code 1 for `--dry-run --fail-on-stale`.
- `WorkItemStatusCommandHandler` rejects `--dry-run --apply`.

## Integration Tests

- `FileSystemWorkItemStatusGateway` scans WI descriptions, product reflections, implementation annotations, and test annotations.
- `FileSystemWorkItemStatusGateway.applyDerivedStatuses` updates only the status frontmatter line and preserves body content.
