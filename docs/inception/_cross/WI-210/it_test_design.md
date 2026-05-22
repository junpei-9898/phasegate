# WI-210 Integration Test Design

## Project Install

| Scenario | Expected result |
|---|---|
| `install --agent claude --skills all --apply` | `skills/phasegate-toolkit-guide/SKILL.md` exists and `.claude/skills/phasegate-toolkit-guide/SKILL.md` resolves. |
| `install --agent codex --skills all --apply` | `skills/phasegate-toolkit-guide/SKILL.md` exists and `.codex/skills/phasegate-toolkit-guide/SKILL.md` resolves. |
| `install --agent both --skills core --apply` | Core skill directories exist, guidance skills are absent, and both agent links point to `../skills`. |
| `install --apply` then second `install --apply` | Manifest and managed files remain idempotent. |

## Repair And Diagnostics

| Scenario | Expected result |
|---|---|
| Old install shape with `.claude/skills -> ../skills` and empty `skills/` | `doctor --agent claude --json` reports `claude-skills-symlink` red. |
| Same old install followed by `reconcile --apply` | Bundled shared skills are deployed and doctor returns green. |

## Published Dogfood

After npm publish, run `npx --yes phasegate@latest install --agent both --with-husky --with-ci --apply` in a fresh project and verify root and agent-linked `phasegate-toolkit-guide/SKILL.md` paths exist.

