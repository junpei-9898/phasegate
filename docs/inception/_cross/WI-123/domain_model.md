---
id: WI-123
type: issue
status: drafted
---

# WI-123 Domain Model

| Concept | Owner | Meaning |
| --- | --- | --- |
| `HookHealth` | harness-api | Operational state for installed hooks and recorded skip events. |
| `HookSkipState` | agent-integration / harness-api | Best-effort record of hook type, skip reason, target paths, and observed time. |
| `BaselineHealth` | harness-api / ci-governance | Retrofit grandfather debt summary, separate from gate pass/fail. |
| `OperationalWarning` | harness-api | Actionable warning with `nextAction` when bypass/skip/debt requires operator review. |

## Invariants

- Hook skip recording is best-effort and never changes hook exit semantics.
- Baseline grandfather is not a validator failure.
- Sha mismatch means the snapshot entry no longer matches current content; it is reported as debt visibility, not as a hard gate.
- Codex native `apply_patch` pre-edit interception remains false until Codex emits hook events for that path; the required backstop is L2 pre-commit.

@work-item-id WI-123
