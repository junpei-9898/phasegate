# Domain Model

## Terms

| Term | Definition |
|---|---|
| Document Path Mapping | A `paths` config entry that lets adopters place PhaseGate-owned documentation outside the default `docs/` tree. |
| Principles Docs Root | The directory configured by `paths.principlesDocs`; default `docs/principles`. Its markdown files are immutable reference docs and are protected by hooks. |
| Folder Rules Doc | The file configured by `paths.folderRulesDoc`; default `docs/folder_management_rules.md`. It is deployed as the documentation placement authority. |
| Personal Documentation Sandbox | The local-only `.phasegate-local/docs/` tree used by personal install so team-owned documentation paths are not mutated. |

## Invariants

- Existing configs that omit `paths.principlesDocs` and `paths.folderRulesDoc` resolve to the default PhaseGate paths.
- Project setup deploys folder rules and principles into the configured target paths, while sourcing canonical content from the packaged PhaseGate docs.
- Personal install config explicitly points principles and folder rules at `.phasegate-local/docs/...`, and the created artifacts match those paths.
- Agent pre-tool-use protection treats the configured principles root and folder rules doc as protected targets.
