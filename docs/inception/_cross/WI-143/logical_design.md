# WI-143 Logical Design

<!-- @work-item-id WI-143 -->

## Scope

WI-143 adds a WI-first workflow guard across setup, doctor diagnostics, and planning skills. The implementation deliberately uses the existing `installation` doctor framework rather than adding a separate traceability command, because the drift is observable as an installation/workflow health problem: a repository can have PhaseGate installed but still allow plan files to bypass WI taxonomy.

## CLI Surface

- `phasegate doctor` includes `wi-workflow-drift`.
- `phasegate scaffold-wi <unit|_cross> <story|issue|chore>` creates `docs/inception/{unit}/WI-XXX/description.md`.
- `phasegate emit-agent-rules` emits the markdown block that can be injected into `AGENTS.md` / `CLAUDE.md`.
- `phasegate init --workflow strict` writes strict quick-mode defaults and scaffolds inception roots.

## Drift Rule

`WiWorkflowDriftCheck` reports red when all of these are true:

- `docs/inception/**/WI-XXX/description.md` count is zero.
- ad-hoc plan files exist outside WI directories, including legacy `codding_plan` paths and `*_plan.md` files.
- if `quickMode.relaxedGates` includes `phase-gate`, the diagnostic message includes that as an additional red-flag context.

The repair hint is intentionally command-shaped: `phasegate migrate work-items --apply`.

## Skill Gatekeeping

`implementation-planner`, `story-writer`, and `logical-designer` now describe a blocking pre-flight check: a WI directory must exist before generating new plan/design output. Legacy `US-XXX` language in these planning surfaces is replaced with `WI-XXX` so the guidance matches the current taxonomy.

