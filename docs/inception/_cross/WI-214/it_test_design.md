# Integration Test Design

| ID | Flow | Expected |
|---|---|---|
| IT-WI214-HOOK-001 | Load a config with custom top-level `paths.principlesDocs` and `paths.folderRulesDoc` through `HarnessConfigConfigQueryAdapter` | Protected file patterns include `documentation/principles/**` and `documentation/folder_rules.md`. |
| IT-WI214-INSTALL-001 | `phasegate install --personal --agent claude --apply --json` | `.phasegate-local/phasegate.config.json` declares local-only principles/folder paths and the files exist at those paths. |
| IT-WI214-VALIDATE-001 | `phasegate validate --layer L2 --format human` after WI-214 edits | Metadata and WI reflection pass. |
