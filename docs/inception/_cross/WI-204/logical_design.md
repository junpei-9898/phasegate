# WI-204 Logical Design

## Design

Quick Mode config recovery is a managed configuration workflow, not an unmanaged file edit workflow. `config:plan --intent quick-mode-relax` previews and applies the supported low-risk category set `["bugfix", "docs", "test", "config"]` after an operator narrows `quickMode.allowedCategories`.

Pre-tool-use enforcement keeps `phasegate.config.json` protected. When a strict or over-narrowed config blocks project-local config edits, the hook guidance points to the quick-mode-relax dry-run/apply path instead of unrelated retrofit bootstrap guidance.

CWD-external absolute write targets are outside the project-local PhaseGate policy surface. The hook resolves the project from `input.cwd`, filters write targets outside that project root before Quick Mode classification, and therefore does not apply project phase policy to runtime/user artifacts such as memory files.

## Validation

- Unit coverage fixes config-file category precedence.
- Integration coverage fixes config recovery guidance and hook dispatch behavior.
- Published-package dogfood verifies `phasegate@0.160.11` strict recovery and CWD-external write behavior.
