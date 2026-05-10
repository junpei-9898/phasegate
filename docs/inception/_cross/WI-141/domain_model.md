<!-- @work-item-id WI-141 -->

# WI-141 Domain Model: Bypass Audit

## Value Objects

| Model | Responsibility |
|---|---|
| `BypassTrailerSet` | Parses and validates `Bypass-Reason`, `Bypass-Evidence`, `Bypass-Owner`, and optional `Bypass-Report` trailers from a commit message. |
| `BypassEvidence` | Represents either `command:<command>` or `report:<path>` evidence. |
| `BypassBlockerClass` | Classifies gate failures into `non-bypassable` or `conditional`. |
| `BypassAuditResult` | Summarizes whether the audited range passed, required bypass evidence, or contained non-bypassable blockers. |

## Rules

- A partial bypass trailer set is invalid.
- `Bypass-Evidence: report:<path>` is valid only when the report path exists.
- `Bypass-Evidence: command:<command>` is valid when the command text is non-empty.
- `Bypass-Report: <path>` is valid only when the report path exists.
- Metadata, test-quality, and work-item-status-staleness failures are non-bypassable.
- Phase-gate, environment, and documented false-positive failures may be bypassed only with complete trailers.

## Integration Points

- `commit-msg` validates trailer syntax before a commit is created.
- `bypass:audit` reuses pre-commit validation and applies bypass policy to the commit range.
- Agent runtime hooks keep using PhaseGate commands and do not own the bypass policy.
