# Unit Test Design

| ID | Target | Scenario | Expected |
|---|---|---|---|
| UT-WI214-CFG-001 | `PathsConfig` | Missing new path keys | Defaults to `docs/principles` and `docs/folder_management_rules.md`. |
| UT-WI214-CFG-002 | `PathsConfig` | Custom `principlesDocs` / `folderRulesDoc` | Values are retained and validated. |
| UT-WI214-SETUP-001 | `deployDesignDocs` | `phasegate.config.json` contains custom principles/folder paths | Canonical docs are copied to those paths and reported in `copiedFiles`. |
| UT-WI214-INSTALL-001 | personal install | Apply personal install | Personal config and created docs use matching `.phasegate-local/docs/...` paths. |
