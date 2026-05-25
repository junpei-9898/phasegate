# Unit Test Design

| ID | Target | Scenario | Expected |
|---|---|---|---|
| UT-WI215-INSTALL-CLAUDE-001 | `RunInstallUseCase.createPersonalTargets` | `personal=true`, `agent=claude` | Plans a Claude context file at a documented runtime-visible path, not `.claude/CLAUDE.local.md`. |
| UT-WI215-INSTALL-CODEX-001 | `RunInstallUseCase.createPersonalTargets` | `personal=true`, `agent=codex` | Does not plan `.codex/AGENTS.local.md`; plans the selected discovery-compatible Codex strategy or emits manual readiness. |
| UT-WI215-EXCLUDE-001 | personal exclude template | New root-local filenames are required | `.git/info/exclude` managed block includes the filenames and preserves existing user excludes. |
| UT-WI215-DOCTOR-001 | personal doctor | Legacy `.codex/AGENTS.local.md` exists but no runtime-visible Codex context exists | Reports non-green readiness for Codex context instead of green. |
| UT-WI215-UNINSTALL-001 | uninstall | Manifest contains old and new personal context artifacts | Removes only PhaseGate-managed artifacts and leaves unmanaged user context intact. |
