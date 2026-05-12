# WI-111 Domain Model

<!-- @work-item-id WI-111 -->

## Concepts

| Concept | Kind | Responsibility |
|---|---|---|
| `CliCommandRegistryPort` | Port | Supplies the canonical public CLI command names that require E2E evidence. |
| `E2eTestFileRegistryPort` | Port | Supplies readable E2E test file contents for command matching. |
| `CliE2eTestExistenceService` | Domain service | Classifies each command as covered, missing, or limitation. |
| `CliE2eTestCoverageReport` | Value object | Exposes uncovered commands, limitations, violation state, and failure messages. |
| `CliCommandCoverageEntry` | Value object entry | Holds one command's coverage status and evidence string. |

## Invariants

- A project with no CLI E2E suite produces `limitation` entries, not `missing` entries.
- `hasViolations()` is true only when at least one entry is `missing`.
- `uncoveredCommands()` excludes `limitation` entries.
- The matching service must use E2E content, not only file paths.
- `phasegate:*` package-script names and direct CLI command names are independent registry entries.

## Failure Semantics

`RunL2ValidatorsUseCase` converts `CliE2eTestCoverageReport.hasViolations()` into `L2-013` HarnessError output. Limitation-only reports are converted to a passing `L2-013` result so consumer projects are not blocked by PhaseGate's internal self-repository coverage rule.

