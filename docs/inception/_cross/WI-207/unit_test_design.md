# WI-207 Unit Test Design

## Unit-Level Assertions

| Case ID | Target | Expectation |
|---|---|---|
| UT-WI207-INS-001 | `RunInstallUseCase` personal target routing | `personal=true` uses `.phasegate-local/config.json` and `.git/info/exclude` only for write targets. |
| UT-WI207-INS-002 | `RunInstallUseCase` personal Codex guidance | Codex user-level hooks are emitted as a manual plan item and are not written as `.codex/hooks.json`. |
| UT-WI207-INS-003 | `text-managed` merge | Existing `.git/info/exclude` user lines are preserved and the PhaseGate block is appended or replaced mechanically. |
| UT-WI207-UNINS-001 | `RunUninstallUseCase` text-managed reverse | Only the PhaseGate personal exclude block is removed; user local exclude content remains. |

## Current Coverage Placement

The implemented regression coverage is integration-level because the behavior is filesystem lifecycle oriented: manifest writes, local git exclude merge, and byte-stability of team-owned files are verified together in `install-handler.test.ts` and `uninstall-handler.test.ts`.
