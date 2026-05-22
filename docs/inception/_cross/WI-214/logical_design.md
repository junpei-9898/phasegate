# Logical Design

## Configuration

Extend the top-level `paths` section with:

- `principlesDocs`: default `docs/principles`
- `folderRulesDoc`: default `docs/folder_management_rules.md`

Presets and generated project/personal config templates include both keys. The `PathsConfig` value object keeps backward compatibility by defaulting missing keys during object creation.

## Deployment

`deployDesignDocs()` resolves the target paths from `phasegate.config.json` when it exists. It still reads source files from PhaseGate's packaged `docs/folder_management_rules.md` and `docs/principles/*.md`, but writes/skips using the configured project-relative destinations.

Personal install keeps the local-only contract by setting:

- `paths.principlesDocs`: `.phasegate-local/docs/principles`
- `paths.folderRulesDoc`: `.phasegate-local/docs/folder_management_rules.md`

The personal install target list writes the same local-only docs so config and manifest entries remain aligned.

## Hook Protection

`HarnessConfigConfigQueryAdapter.getProtectedFilePatterns()` appends config-derived protection patterns:

- `${paths.principlesDocs}/**`
- `${paths.folderRulesDoc}`

Configured `protectedFiles.patterns` remain additive and `protectedFiles.exclude` still applies in the existing protected-file list composition.
