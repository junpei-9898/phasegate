# WI-114 Domain Model

## Concepts

| Concept | Owner | Meaning |
|---|---|---|
| `DriftItem` | validator-system | Raw detected design-code drift. |
| `DriftReportSummary` | harness-api | Repository-scale drift report with sample, totals, summaries, and action plan. |
| `DriftCategorySummary` | harness-api | Category/severity/next-action aggregate for prioritization. |

## Invariants

- `rawDriftCount` is the count before compaction.
- `drifts.length` may be lower than `rawDriftCount` when sample limiting is active.
- `categorySummaries` and `actionPlan` are derived from the full raw set, not only the sample.
- Default drift reporting is advisory and returns pass semantics with warnings.

