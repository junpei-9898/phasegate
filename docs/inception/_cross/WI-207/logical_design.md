# WI-207 Logical Design

## CLI Contract

`phasegate install --personal` routes the install use case into a personal target set. The default install behavior remains unchanged.

Personal target set:

| Target | Strategy | Ownership |
|---|---|---|
| `.phasegate-local/config.json` | `copy` | personal artifact |
| `.git/info/exclude` | `text-managed` | local git metadata |
| `~/.codex/hooks.json` | manual plan item only | user-level external setting |

Excluded target set:

`package.json`, `AGENTS.md`, `CLAUDE.md`, `.codex/hooks.json`, `.claude/settings.json`, `.husky/*`, `.github/workflows/*`, `.gitignore`, and agent skill symlinks are not part of the personal plan.

## Application Design

`RunInstallUseCase` accepts `personal?: boolean`.

- `personal=false`: existing structured install target generation is used.
- `personal=true`: `createPersonalTargets()` is used, skill symlink creation is skipped, Husky and CI inputs are treated as disabled, and Codex user-level hook setup is emitted as a manual plan item when Codex is selected.

`text-managed` is a mechanical merge strategy for `.git/info/exclude`. It appends or replaces a bounded PhaseGate block without interpreting existing local exclude lines.

`copy` creates `.phasegate-local/config.json` only when absent. Existing personal config content is considered user-owned and is not overwritten by install.

## Uninstall Design

`RunUninstallUseCase` recognizes `.git/info/exclude` as `text-managed`. During uninstall it removes only the personal exclude block and archives the manifest. Created `.phasegate-local/config.json` is removed through the existing created-file path.
