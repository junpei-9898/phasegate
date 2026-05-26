# WI-217 Logical Design

## Scope

Make personal install's local documentation roots first-class inputs to L4 validation and WI scaffolding, so inception/product reflection gaps are visible without mutating team-owned `docs/`.

## Design

### L4-002 Personal Consistency Check

- Add a document-root-aware consistency path to L4-002.
- Resolve roots through the same config loader used by other validators:
  - `inceptionRoot = config.paths.inceptionDocs ?? "docs/inception"`
  - `designRoot = config.paths.designDocs ?? "docs/product/construction"`
- Discover `description.md` files under `inceptionRoot`.
- Extract each WI ID through a shared extractor that supports:
  - current `WI-XXX` directory layout,
  - frontmatter `id`,
  - configured layout/pattern fields once added.
- Scan markdown under `designRoot` for `@work-item-id` annotations.
- Emit findings for:
  - `missing-product-reflection`: inception WI requires product reflection but no product doc references it,
  - `orphan-product-reflection`: product doc references a WI ID absent from inception,
  - `invalid-work-item-id`: extractor cannot identify an ID or frontmatter conflicts with layout.

The old annotation/ADR consistency service can remain, but L4-002's orchestration must not skip when document roots are available. If no supported input exists, the skip reason should say what was missing.

### L4-004 Scope Fix

- Change `RunL4ValidatorsUseCase` so the L4-004 adapter calls `checkDocFreshnessUseCase.execute({ targetPattern })`.
- Derive `targetPattern` from config when the user did not pass an explicit pattern:
  - default project: `docs/product/construction/**/*.md`,
  - personal install with config: `${paths.designDocs}/**/*.md`.
- Preserve `p2:check-freshness --pattern` as an explicit CLI override.
- Keep root `docs/**/*.md` only as a fallback for older configs where `paths.designDocs` is absent and no construction root exists.

### Personal Hook Template

- Update the personal pre-commit template to detect staged paths under configured personal roots.
- For `.phasegate-local/inception/**` or `.phasegate-local/product/**` changes, run:
  - pointer/freshness checks scoped to `.phasegate-local/**`,
  - L4-002 consistency check scoped to configured inception/design roots.
- Avoid requiring source metadata in personal install just to validate docs.

### Scaffold WI

- Extend `scaffold-wi` with explicit ID and root/layout support while keeping current positional usage:
  - `phasegate scaffold-wi <unit|_cross> <story|issue|chore>` remains unchanged and writes `docs/inception/{unit}/WI-XXX`.
  - New option `--id <id>` writes the supplied ID instead of allocating `WI-XXX`.
  - New option or config field selects inception root; in personal repos it may default to `paths.inceptionDocs`.
  - A layout field can map `{unit}/{workItemId}` or `{unit}/{subUnit}/{workItemId}`.
- The same extractor/config fields are used by metadata/status validators.

## Migration / Compatibility

- Existing PhaseGate repos with no new config keep the current `WI-XXX` layout and CLI output.
- Existing tests that assert help text should be updated to include new options without changing the current signature.
- Config fields should be optional. Absence means current behavior.

## Risks

- Treating every personal `description.md` as requiring product reflection may over-warn for lightweight exploration. Mitigation: respect WI `type`, and optionally allow `status: drafted` warnings rather than hard failures in non-strict mode.
- Multiple ID syntaxes can make regex-based parsing fragile. Mitigation: centralize extraction and keep validators dependent on the extractor port.
- Personal hook runtime must stay fast. Mitigation: only run scoped consistency when staged paths touch personal inception/product roots.
