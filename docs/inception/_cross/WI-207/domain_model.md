# WI-207 Domain Model

## Personal Install Mode

`Personal Install Mode` is an install lifecycle variant for a developer who wants PhaseGate in a team repository without mutating team-owned files. It is selected by `phasegate install --personal`.

## Domain Terms

| Term | Meaning |
|---|---|
| Team-owned file | Repository policy files expected to be shared by the team, including `package.json`, `AGENTS.md`, `CLAUDE.md`, `.husky/*`, `.github/workflows/*`, and `.gitignore`. |
| Personal artifact | Local-only PhaseGate state created for one developer, currently `.phasegate-local/config.json`, `.git/info/exclude`, and lifecycle manifest state under `.phasegate/`. |
| Personal exclude block | A managed block in `.git/info/exclude` that ignores PhaseGate local artifacts without touching team `.gitignore`. |
| User-level Codex hooks | Codex hook settings outside the project root, represented as manual guidance in personal install output rather than a project-local write. |

## Invariants

- Personal install plans must not contain team-owned files.
- Personal install apply must leave existing team-owned file bytes unchanged.
- Personal install uses `.git/info/exclude`; it must not write `.gitignore`.
- Personal install uninstall must remove only personal artifacts and reverse the personal exclude block.
- Project-local Codex hook files are not created in personal mode; user-level Codex hook setup remains manual guidance.
