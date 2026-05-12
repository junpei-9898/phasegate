# WI-114 Logical Design

## Scope

`phasegate:detect-drift --json` must remain useful when repository-scale drift counts are large. The command is advisory by default and should show where to act first.

## Design

`harness-api` compacts raw drift items into `DriftReportSummary`: a bounded sample, full raw count, category summaries, top action plan, and warnings when output is compacted.

The L4 policy remains aligned with WI-107: drift output is advisory unless the caller explicitly chooses a gating mode that fails on warnings.

## Operational Rule

Repository-scale output must not be only a raw list. It must include category, severity, and next-action data for maintainers to pick the next remediation task.

