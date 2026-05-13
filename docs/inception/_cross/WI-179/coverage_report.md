# WI-179 Coverage Report

<!-- @work-item-id WI-179 -->

## Planned Coverage

| Requirement | Coverage |
|---|---|
| Scoped-out JSON cannot be misread as an immediate repair target | `doctor-handler.test.ts` asserts suppressed `repairHint` / `suggestedSkill` and explicit repair applicability. |
| Full-scope findings keep repair guidance | `doctor-handler.test.ts` asserts default doctor on the same fixture retains mechanical repair hints. |
| Human output clarifies scoped-out semantics | `doctor-handler.test.ts` asserts the scoped-out summary text. |
| Guidance docs explain agent interpretation | CLI reference, troubleshooting, and guidance skills include WI-179 notes. |

## Dogfood

After publish, run a fresh package install and verify Claude-only setup with `phasegate doctor --agent claude --json`.
