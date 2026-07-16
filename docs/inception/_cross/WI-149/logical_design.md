# WI-149 Logical Design: Public Documentation Contract Mismatch Remediation

@work-item-id WI-149

## Change Strategy

Update public-facing documentation before changing release state. The canonical implementation contracts remain in the existing source and product documents; this WI aligns README / guide / DEVELOPMENT.md wording with those contracts.

## Contract Decisions

- `paths.designDocs` means the construction document root, normally `docs/product/construction`, not the whole `docs/product` root.
- The implemented skill-quality commands use the `skill:*` CLI family as public names. `harness:skill-quality:plan-checker` is not a package script and must not be presented as one.
- HarnessError recovery metadata is additive: `suggested_skill`, `scaffold_command`, and `template_path` may be present, but consumers must accept payloads without them.
- Staged Markdown metadata validation is part of `phasegate pre-commit`; users should not need a separate public Markdown hook.

## Touched Surfaces

- `docs/guide/configuration.md`
- `docs/guide/hooks-integration.md`
- `DEVELOPMENT.md`
- `docs/product/construction/harness-error/*`
- `docs/product/units/harness-error_unit.md`
- `docs/product/units/integration_contract.md`

