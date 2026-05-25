# WI-216 Integration Test Design

<!-- @work-item-id WI-216 -->

## CLI Lifecycle

| Scenario | Verification |
|---|---|
| `install --personal --agent claude --apply` against existing `.claude/skills` with missing bundled skills | Selected bundled skills are copied, user-owned skills remain, and manifest contains per-skill entries. |
| `install --personal --agent codex --apply` against existing `.codex/skills` | Codex receives the same refresh behavior as Claude. |
| `install --agent both --skills core --apply` against existing root `skills/user-owned` | Only core bundled skills are added to root `skills`, symlinks are created, and user-owned skill remains. |
| `reconcile --apply` after bundled skills are deleted from a manifest-managed install | Missing bundled skills are restored and manifest entries are refreshed. |
| `uninstall --apply` after personal install with user-owned skills | Bundled skills and `.harness-version` are removed while user-owned skills remain. |
| `doctor --json --agent claude` with incomplete skills target | JSON includes the selected agent skills finding with mechanical repair guidance. |

