---
traceability:
  initial_creation: true
---

# WI-170 Domain Model

## Decision

`p2:check-initial-creation` is a public compatibility command. The canonical scheduled path remains L4 validation, but the command stays documented for users who need to inspect long-lived `initial_creation: true` documents directly.

## Concepts

| Concept | Responsibility |
|---|---|
| Initial creation expiration rule | Defines when a document with `initial_creation: true` is stale enough to report. |
| `phase2Extensions.initialCreationExpirationRules` | Public compatibility config section consumed by the Phase 2 extensions adapter. |
| Compatibility command | CLI surface that remains supported, while guides should point regular validation flows to `validate --layer L4`. |

## Rule Fields

| Field | Type | Contract |
|---|---|---|
| `ruleId` | string | Stable identifier for reporting and debugging. |
| `documentPattern` | string | Glob pattern for documents to inspect. |
| `daysThreshold` | number | Non-negative age threshold in days. |
| `commitCountThreshold` | number | Non-negative commit-count threshold. |
| `evaluationMode` | `"or"` or `"and"` | Whether either threshold or both thresholds must be met. |
| `enabled` | boolean, optional | Defaults to `true` when omitted. |

## Policy

Newly created docs may keep `initial_creation: true` while the team is still filling product or inception content. Long-lived docs should remove the marker once their minimum expected content exists, or the command should report them as stale according to the configured thresholds.
