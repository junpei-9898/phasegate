# WI-140 Domain Model

<!-- @work-item-id WI-140 -->

## Concepts

- `WorkItemStatusEvidence.missingInceptionArtifacts`: required inception artifacts absent from the WI directory.
- `WorkItemStatusEvidence.missingImplementation`: true when non-chore work has no implementation evidence.
- `WorkItemStatusEvidence.missingTests`: true when story/issue/refactor work has implementation evidence but no test evidence.
- `WorkItemStatusEvidence.validation`: validation state for green evidence, with `state`, `source`, and `blockingValidation`.
- `WorkItemStatusPolicyPort`: validator-system port that exposes stale WI reports as a gate input.

## Invariants

- `WorkItemStatusReport.stale` remains a pure current-vs-derived comparison.
- Structured missing evidence mirrors the human `reason` / `nextAction` strings but is the machine-readable contract for agents and CI.
- L2 status validation does not write files.
- Apply mode updates only stale reports and rejects downgrades unless explicitly allowed.
- `tested` can be derived from test evidence, but it is considered CI-green only when the L2 validation source has no blocking validation.
