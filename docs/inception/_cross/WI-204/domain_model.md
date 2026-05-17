# WI-204 Domain Model

## Concepts

- **Managed Config Intent**: a named, reviewable configuration change whose target fields, risks, rollback, and apply path are owned by PhaseGate.
- **Quick Mode Relax Intent**: the managed config intent that restores `quickMode.allowedCategories` to `["bugfix", "docs", "test", "config"]`.
- **Project Write Target**: a write target under the resolved project root that is subject to PhaseGate phase and Quick Mode policy.
- **External Runtime Artifact**: an absolute write target outside the resolved project root. It is not classified as a project change by the pre-tool-use project policy.

## Invariants

- `phasegate.config.json` direct edits remain protected when Quick Mode policy does not allow `config`.
- A blocked config-category edit must provide a recovery path that can actually change `quickMode.allowedCategories`.
- Quick Mode classification treats config files as `config` before comment-only heuristics.
- CWD-external write targets do not cause a project-local Full Mode requirement.
