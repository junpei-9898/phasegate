# WI-126 Domain Model

<!-- @work-item-id WI-126 -->

## Concepts

- `WorkItemStatusInput`: frontmatter plus derived evidence from inception, product, source, and test artifacts.
- `WorkItemStatusReport`: current status, derived status, reason, next action, and evidence details.
- `WorkItemStatusEvidence`: reflected units, missing reflection units, implementation paths, and test paths.
- `WorkItemStatusPort`: filesystem boundary for collecting evidence and applying status updates.

## Invariants

- Derived status never depends on the existing frontmatter status.
- Apply mode updates only stale reports.
- Apply mode changes only the `status:` line inside the YAML frontmatter of `description.md`.
- `completed` remains accepted as legacy/frontmatter compatibility but derivation emits the documented four-state machine.
