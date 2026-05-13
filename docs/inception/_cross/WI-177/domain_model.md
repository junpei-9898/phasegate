# WI-177 Domain Model: Readiness-To-Work Guidance

<!-- @work-item-id WI-177 -->

## Concepts

| Concept | Meaning |
|---|---|
| Agent readiness row | One `plan.agentReadiness` row for `claude`, `codex`, or `shared`. |
| Post-readiness workflow | The work-start sequence followed after selected local readiness rows are `configured`. |
| Structured apply error | JSON error payload containing `target`, `operation`, `code`, `likelyCause`, `recovery`, and `partialChanges`. |
| Recovery route | The agent-facing decision between permission request, path cleanup, managed-target merge review, or read-only guidance. |

## Rules

- `claude` and `shared` readiness configured means local setup files are present, not that external CI or user-level settings are complete.
- Post-readiness workflow starts with WI identification and planning, not another setup command.
- `EPERM`, `EACCES`, and `EROFS` imply permission or writable-workspace recovery.
- `EEXIST` and `ENOTDIR` imply incompatible existing path recovery.
- Managed target refusal or hash mismatch implies ai-assisted recovery through `phasegate-config-doctor`.
