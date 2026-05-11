---
id: WI-143
type: story
status: drafted
---

# WI-143 TDD Implementation Plan

## Scope

Implement WI-first workflow enforcement as a publish-ready patch:

- Add structural drift detection to `phasegate doctor`.
- Add `phasegate scaffold-wi <unit> <type>`.
- Add `phasegate emit-agent-rules`.
- Add `phasegate init --workflow strict` config generation.
- Add WI pre-flight blocking instructions to the three planning skills.
- Bump package version and verify pack readiness.

## Test Strategy

- Unit test the new doctor heuristic with synthetic `docs/inception` and config inputs.
- CLI-smoke the new commands with temporary projects:
  - `doctor` returns non-zero for WI count 0 + ad-hoc plan.
  - `scaffold-wi` creates `docs/inception/{unit}/WI-XXX/description.md`.
  - `emit-agent-rules` prints an injectible markdown block.
  - `init --workflow strict` writes strict quickMode config.
- Run targeted Vitest for changed areas, then full `pnpm test` and `npm pack --dry-run`.

## Implementation Notes

- Keep `doctor` in the existing installation module because WI-145 already owns the sibling `phasegate doctor` command.
- Keep `scaffold-wi` filesystem logic small and CLI-local unless reuse pressure appears.
- Treat migration implementation as out of scope; output must suggest `phasegate migrate work-items --apply`.
