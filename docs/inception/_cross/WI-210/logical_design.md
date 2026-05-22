# WI-210 Logical Design: Project Install Shared Skills

## Approach

`RunInstallUseCase` adds a non-personal shared skills deployment step between managed file writes and agent skill link creation. The step copies the selected bundled skill directories into root `skills/`, writes `skills/.harness-version`, and records manifest entries for each deployed skill directory plus the version file.

The manifest intentionally does not record root `skills/` as a single created directory. Per-skill entries let `RunUninstallUseCase` remove managed bundled skills while preserving unrelated user-owned skill directories under the same root.

`RunReconcileUseCase` adds the same shared skills deployment as a repair target. When an existing manifest contains `.claude/skills` or `.codex/skills` but lacks managed skill entries, reconcile plans and applies a shared skills repair using the current bundled `all` selection.

`ClaudeSkillsSymlinkCheck` and `CodexSkillsSymlinkCheck` validate both the link/directory path and the presence of skill content. A symlink to `../skills` with an empty target now reports a red mechanical finding.

## Lifecycle Behavior

| Command | Behavior |
|---|---|
| `install --agent claude --apply` | Deploys selected root `skills/`, creates `.claude/skills -> ../skills`, and records managed skill entries. |
| `install --agent codex --apply` | Deploys selected root `skills/`, creates `.codex/skills -> ../skills`, and records managed skill entries. |
| `install --agent both --apply` | Deploys one shared root `skills/` set and links both agents to it. |
| `install --skills core|all` | Uses the selected bundled set for copied directories and manifest hash inputs. |
| `reconcile --apply` / `update-skills --apply` | Repairs missing shared skills for older project installs. |
| `doctor --agent ...` | Reports missing skill target content even when the symlink itself is present. |
| `uninstall --apply` | Removes only manifest-managed skill directories/version file and agent links. |

## Compatibility

Existing installs created by `phasegate@0.160.15` have valid skill symlink manifest entries but an empty target. Reconcile treats those links as evidence that shared skills are intended and deploys the current `all` skill set.

