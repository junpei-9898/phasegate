# WI-207 Integration Test Design

## Regression Coverage

| Case ID | Flow | Expectation |
|---|---|---|
| IT-WI207-INS-001 | `phasegate install --personal --apply` against a project containing team-owned files | Plan excludes `package.json`, `AGENTS.md`, `CLAUDE.md`, `.husky/*`, `.github/workflows/*`, and `.gitignore`; apply leaves their bytes unchanged. |
| IT-WI207-INS-002 | Same flow | `.phasegate-local/config.json` is created, `.git/info/exclude` receives a managed personal block, and `.phasegate/manifest.json` records the personal artifacts. |
| IT-WI207-UNINS-001 | `phasegate uninstall --apply` after personal install | `.phasegate-local/config.json` is removed and `.git/info/exclude` keeps user local exclude lines while losing the PhaseGate block. |
| IT-WI207-UNINS-002 | Same uninstall flow | Team-owned file bytes remain unchanged. |
