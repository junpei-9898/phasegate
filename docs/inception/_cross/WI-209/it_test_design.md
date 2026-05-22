# WI-209 Integration Test Design

<!-- @work-item-id WI-209 -->

| Case ID | Flow | Expectation |
|---|---|---|
| IT-WI209-CLAUDE-001 | `phasegate install --personal --agent claude --apply` | `.claude/settings.json` is a regular file and `.claude/skills` is a real directory, not symlinks. |
| IT-WI209-CODEX-001 | `phasegate install --personal --agent codex --apply` | `.codex/hooks.json` is a regular file and `.codex/skills` is a real directory, not symlinks. |
| IT-WI209-BOTH-001 | `phasegate install --personal --agent both --apply` | Both agent runtime surfaces are real artifacts and `.phasegate-local/phasegate.config.json` exists. |
| IT-WI209-PRESERVE-001 | Personal install in a repository with team-owned files | `package.json`, `CLAUDE.md`, `AGENTS.md`, Husky hooks, CI workflow, and `.gitignore` remain byte-identical. |
| IT-WI209-DOCTOR-001 | `phasegate doctor --agent claude|codex --json` after personal install | Selected agent reports green runtime readiness with personal scope. |
| IT-WI209-UNINSTALL-001 | `phasegate uninstall --apply` after personal install | Managed real runtime artifacts are removed and team-owned files remain byte-identical. |
| IT-WI209-DOGFOOD-TEAM-001 | Project/team `phasegate install --agent both --with-husky --apply` followed by hook CLI calls | Team install creates `phasegate.config.json`, agent hooks, skill links, Husky hooks, and `hook pre-tool-use` blocks protected-file writes without config ENOENT. |

## Local Verification Evidence

<!-- @work-item-id WI-209 -->

2026-05-22 local dogfood used the workspace CLI against isolated git repositories under `/private/tmp/phasegate-dogfood-wi209-*`.

| Check | Command | Result |
|---|---|---|
| Personal both apply | `tsx scripts/harness/main.ts install --personal --agent both --apply --json` | Created `.phasegate-local/phasegate.config.json`, real `.claude/settings.json`, real `.claude/skills/`, real `.codex/hooks.json`, real `.codex/skills/`, `.git/info/exclude`, and manifest entries. |
| Real Claude runtime artifacts | `test -f .claude/settings.json && test ! -L .claude/settings.json && test -d .claude/skills && test ! -L .claude/skills` | PASS; Claude runtime artifacts were not symlinks. |
| Real Codex runtime artifacts | `test -f .codex/hooks.json && test ! -L .codex/hooks.json && test -d .codex/skills && test ! -L .codex/skills` | PASS; Codex runtime artifacts were not symlinks. |
| Personal doctor | `tsx scripts/harness/main.ts doctor --agent both --json` | `scope.installationMode` was `personal`, `overallStatus` was `green`, and findings were empty. |
| Personal session context | `tsx scripts/harness/main.ts hook session-start` | Returned Codex-compatible `hookSpecificOutput.hookEventName = "SessionStart"` and included protected-file context. |
| Personal prompt refresh | `tsx scripts/harness/main.ts hook user-prompt-submit` | Returned Codex-compatible `hookSpecificOutput.hookEventName = "UserPromptSubmit"` and included protected-file context. |
| Personal protected-file block | `tsx scripts/harness/main.ts hook pre-tool-use` with `echo x > biome.json` payload | Exit `2`; stderr contained `biome.json`. |
| Project/team apply | `tsx scripts/harness/main.ts install --agent both --with-husky --apply --json` | Created `phasegate.config.json`, `.claude/settings.json`, `.codex/hooks.json`, `skills/`, `.claude/skills -> ../skills`, `.codex/skills -> ../skills`, `AGENTS.md`, `CLAUDE.md`, `package.json`, Husky hooks, CI workflow, and manifest entries. |
| Project/team doctor | `tsx scripts/harness/main.ts doctor --agent both --json` | `overallStatus` was `green`, `exitCode` was `0`, and findings were empty. |
| Project/team protected-file block | `tsx scripts/harness/main.ts hook pre-tool-use` with `echo x > biome.json` payload | Initially exposed a missing `phasegate.config.json` runtime error; after the install target fix, exit `2` and stderr contained `biome.json`. |
