# WI-213 Logical Design: Personal Install Core Defenses

## Approach

`RunInstallUseCase.createPersonalTargets` expands the personal target set with local-only equivalents for the three missing defense systems:

| Defense | Personal target |
|---|---|
| Agent context | `.claude/CLAUDE.local.md` for Claude, `.codex/AGENTS.local.md` for Codex |
| Commit-time hooks | `.git/hooks/pre-commit`, `.git/hooks/commit-msg` |
| Reference docs | `.phasegate-local/docs/folder_management_rules.md` and `.phasegate-local/docs/principles/*.md` |

The agent context uses the existing managed markdown templates so the PhaseGate rules stay aligned with project install. The git hooks use personal-specific templates that do not source Husky bootstrap files. Reference docs are copied from the published package into the personal sandbox and are protected by `.git/info/exclude`.

`docs/templates/personal/phasegate-local-config.json` changes `paths.designDocs` and `paths.inceptionDocs` to local-only paths so personal validators do not require team-owned `docs/product` or `docs/inception` directories.

## Compatibility

Existing personal installs can run `phasegate install --personal --apply` again. New targets are planned as missing and added to the manifest without mutating team-owned files.

