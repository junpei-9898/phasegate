# WI-208 Logical Design

<!-- @work-item-id WI-208 -->

## Overview

Extend `phasegate install --personal` from a minimal local config installer into a complete local-only agent setup path. The default safety property remains unchanged: team-owned files are not modified.

## Target Layout

Preferred sandbox layout:

```text
.phasegate-local/
  phasegate.config.json
  manifest.json
  skills/
  claude/
    settings.json
```

Root discovery shim:

```text
.claude/settings.json -> ../.phasegate-local/claude/settings.json
.claude/skills -> ../.phasegate-local/skills
```

This keeps all substantive PhaseGate artifacts under `.phasegate-local/` while satisfying Claude Code's root `.claude` discovery convention.

## Install Planning

`RunInstallUseCase.createPersonalTargets()` should become agent-aware.

For `--personal --agent claude`:

- copy `docs/templates/personal/phasegate-local-config.json` to `.phasegate-local/phasegate.config.json`
- copy `templates/.claude/settings.json` to `.phasegate-local/claude/settings.json`
- deploy bundled skills into `.phasegate-local/skills`
- create root shim `.claude/settings.json` and `.claude/skills`
- merge `.git/info/exclude` so `.phasegate-local/`, `.phasegate/`, `.claude/`, `.codex/`, `skills/`, and root `phasegate.config.json` stay local-only

For `--personal --agent codex`:

- do not write `~/.codex/hooks.json`
- return a manual external action for Codex user-level hooks
- do not create project-local `.codex/hooks.json`

For `--personal --agent both`:

- initialize Claude local sandbox artifacts
- report Codex setup as manual external action

## Config Resolution

Config-foundation should resolve config in this order:

1. Explicit CLI config path, if supported by the command.
2. Root `phasegate.config.json`.
3. `.phasegate-local/phasegate.config.json`.
4. Built-in defaults or existing command-specific fallback.

The fallback should be observable in doctor/setup output so users understand they are running from personal config.

## Uninstall

Manifest entries for personal sandbox and root shim must be recorded so `phasegate uninstall --apply` can remove only those entries.

Uninstall must:

- delete `.phasegate-local/phasegate.config.json`
- delete `.phasegate-local/claude/settings.json`
- delete `.phasegate-local/skills`
- remove `.claude/settings.json` / `.claude/skills` shim when they match PhaseGate-managed symlink targets
- reverse-merge the PhaseGate block from `.git/info/exclude`
- preserve team-owned files and unrelated `.git/info/exclude` lines

## Existing Path Conflicts

If `.claude/settings.json`, `.claude/skills`, or `.claude` already exists and is not a PhaseGate-managed personal shim, personal install must not overwrite it by default. The plan should return a manual/refused item with recovery guidance.
