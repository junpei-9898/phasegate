# WI-217 Domain Model

## Concepts

| Concept | Meaning |
|---|---|
| Personal documentation roots | Config-resolved roots for local-only AIDLC docs: `paths.inceptionDocs` and `paths.designDocs`. |
| Work item identity | Stable external or PhaseGate ID declared by `description.md` frontmatter `id` and the parent directory. It is not always limited to `WI-\d+` in personal sandbox use. |
| Inception coverage | The set of work item identities present under the configured inception root. |
| Product reflection coverage | The set of work item identities referenced by `@work-item-id` annotations under the configured design docs root. |
| Consistency gap | A missing or contradictory relationship between inception coverage and product reflection coverage. |
| Personal hook scope | The subset of staged changes under `.phasegate-local/inception`, `.phasegate-local/product`, or config-selected personal roots that should trigger local consistency checks. |

## Invariants

- `paths.inceptionDocs` is the source of truth for WI discovery when config is present.
- `paths.designDocs` is the source of truth for construction design scanning when config is present.
- Root `docs/` scanning is a fallback for legacy/default projects, not an override for explicit paths.
- `description.md` frontmatter `id` and the containing work item directory must agree for native PhaseGate WI IDs. For configurable personal layouts, the configured extractor defines which directory segment must agree with `id`.
- L4-002 must not silently SKIP when both inception and design roots are resolvable.
- Missing product reflection for a drafted personal WI is at least a warning; strict/fail-on-warning modes may promote it to failure.

## Domain Rules

### WI Identity Extraction

1. Default extraction keeps current behavior: `docs/inception/{unit}/WI-XXX/description.md` and `docs/inception/_cross/WI-XXX/description.md`.
2. Configurable extraction accepts an explicit ID from frontmatter `id` first.
3. A configured layout may identify the work item directory as the last segment or a named segment, e.g. `{unit}/{subUnit}/{workItemId}`.
4. Validators use the same extractor as `scaffold-wi`; there must not be separate hardcoded `WI-\d+` parsing paths.

### Inception/Product Consistency

- For each discovered inception work item, scan configured design docs for `@work-item-id <id>` references.
- If no reflection exists and the WI type requires product reflection (`story`, `issue`, `refactor`, `fix`), report a consistency gap.
- `chore` may be ignored by default because product reflection is not required.
- When product design references an ID that cannot be resolved in inception, report an orphan reflection warning unless the ID is a legacy/external ID declared by config.

### Freshness Scope

- L4-004 receives an effective document pattern from config if no explicit CLI pattern is supplied.
- For personal install, the default pattern is `${paths.designDocs}/**/*.md`.
- `p2:check-freshness --pattern <glob>` remains an explicit override and keeps existing behavior.

## Ownership

| Area | Owner Unit |
|---|---|
| L4-002 result semantics and validator orchestration | validator-system |
| Freshness document discovery and rule loading | phase2-extensions |
| Config path and future layout/id pattern fields | config-foundation |
| Personal hook template and install artifact updates | installation |
| WI metadata extraction / status compatibility | traceability-model |
| CLI option parsing and help for `scaffold-wi` / validate routing | harness-api |
