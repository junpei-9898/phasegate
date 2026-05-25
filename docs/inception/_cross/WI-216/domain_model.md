# WI-216 Domain Model: Managed Skill Catalog

<!-- @work-item-id WI-216 -->

## Concepts

| Concept | Meaning |
|---|---|
| BundledSkill | A PhaseGate-shipped skill directory under package `skills/<name>`. |
| ManagedSkillEntry | A manifest entry for one bundled skill target, such as `.codex/skills/phasegate-config-doctor` or `skills/phasegate-toolkit-guide`. |
| SkillCatalogMetadata | `.harness-version` in a skills catalog. It records version and selected skill set but does not own user skill directories. |
| UserOwnedSkill | Any skill directory whose name is not in the selected bundled skill list or not represented by a PhaseGate manifest entry. |
| LegacyPersonalSkillCatalog | `.claude/skills` or `.codex/skills` with `.harness-version` but missing per-skill manifest entries. |

## Invariants

- A skills parent directory is not proof of ownership.
- A bundled skill directory path can be overwritten only when its name is in the current bundled skill allowlist.
- User-owned skill directories are never removed by install, reconcile, or uninstall.
- Manifest entries for skills prefer per-skill paths. Parent directory entries are compatibility records only.
- Catalog metadata may be recreated when selected bundled skills are refreshed.
- Parent skills directories are removed only after managed content removal leaves them empty.

