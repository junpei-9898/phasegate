# WI-216 Logical Design: Existing Skills Merge And Uninstall

<!-- @work-item-id WI-216 -->

## Approach

PhaseGate skills deployment is managed at bundled skill directory granularity. The parent skills catalog can contain user-owned skill directories, so install, reconcile, and uninstall must not treat `.claude/skills`, `.codex/skills`, or root `skills` as a destructive owned directory.

`RunInstallUseCase` refreshes only the selected bundled skills returned by `getSkillsForSet("core" | "all")`.

| Mode | Managed skills target | Agent surface |
|---|---|---|
| Personal Claude | `.claude/skills/<bundled-skill>` | real directory |
| Personal Codex | `.codex/skills/<bundled-skill>` | real directory |
| Project Claude | `skills/<bundled-skill>` | `.claude/skills -> ../skills` |
| Project Codex | `skills/<bundled-skill>` | `.codex/skills -> ../skills` |

The `.harness-version` file remains catalog metadata. It records `version`, `deployedAt`, and `skillSet`, but it is not used as proof that every required bundled skill exists. Planning checks the selected bundled skill directories directly.

## Legacy Adoption

Existing personal skills directories that contain `.harness-version` are treated as legacy PhaseGate-managed catalogs even when `.phasegate/manifest.json` lacks a matching entry. Install can adopt them by refreshing selected bundled skills and writing per-skill manifest entries. Unknown directories under the same catalog remain user-owned.

Existing skills directories without `.harness-version` are still mergeable when a required bundled skill is missing, but PhaseGate only overwrites directories whose names match bundled skill names. User-owned directories are preserved.

## Uninstall

Uninstall removes manifest-managed bundled skill entries and catalog metadata. A legacy manifest entry for `.claude/skills` or `.codex/skills` is interpreted as an old parent-directory skill deployment and reversed by deleting known bundled skill directories plus `.harness-version`, then leaving the parent directory when user-owned skills remain.

Project symlinks are unlinked only when the actual symlink target still matches the manifest hash. Real directories or unrelated symlinks remain manual review targets.

## Doctor

Doctor validates skills by required bundled skill completeness, not just by the existence of any `SKILL.md` or `.harness-version`. It reports a mechanical finding when the selected agent's skills target is missing bundled PhaseGate skills or has stale catalog metadata that can be fixed by install/reconcile.

