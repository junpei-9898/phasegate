# WI-209 Logical Design

<!-- @work-item-id WI-209 -->

## Personal Install Artifact Layout

```text
.phasegate-local/
  phasegate.config.json

.claude/
  settings.json
  skills/

.codex/
  hooks.json
  skills/
```

The agent-facing `.claude/*` and `.codex/*` paths are real runtime artifacts. They are not symlinks. This avoids relying on agent-specific symlink traversal behavior during settings, hooks, or skills discovery.

## Install Planning

<!-- @work-item-id WI-209 -->

For personal mode:

- always plan `.phasegate-local/phasegate.config.json`
- when Claude is selected, plan `.claude/settings.json` as a copied JSON file and `.claude/skills` as a copied directory
- when Codex is selected, plan `.codex/hooks.json` as a copied JSON file and `.codex/skills` as a copied directory
- merge the local-only block into `.git/info/exclude`
- record every created personal artifact in `.phasegate/manifest.json`

The planner must refuse or mark manual when an existing path is not a PhaseGate-managed personal artifact.

Dogfooding also covers the comparable project/team install mode. Project install must create `phasegate.config.json` when absent because the installed `.claude/settings.json` and `.codex/hooks.json` call `phasegate hook ...`, and `pre-tool-use` requires a discoverable config path. Existing project config remains user-owned and is preserved.

## Uninstall

<!-- @work-item-id WI-209 -->

`uninstall --apply` uses manifest entries to delete only managed personal files/directories and reverse only the managed `.git/info/exclude` block. It must not delete unrelated `.claude` or `.codex` user content.

## Doctor

<!-- @work-item-id WI-209 -->

Doctor checks should treat real files/directories as valid. Symlink-only assumptions for `.claude/skills` and `.codex/skills` are removed from the personal readiness path.
