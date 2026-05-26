# WI-217 Unit Test Design

## Validator-System

| Test ID | Target | Setup | Expected |
|---|---|---|---|
| UT-WI217-L4002-001 | L4-002 consistency orchestration | Config roots point to `.phasegate-local/inception` and `.phasegate-local/product/construction`; inception has `ID-09-02`; design root is empty. | Result includes `missing-product-reflection` for `ID-09-02`; validator is not skipped. |
| UT-WI217-L4002-002 | L4-002 skip reason | Config roots are absent or unreadable. | Result is skipped with a machine-readable reason. |
| UT-WI217-L4002-003 | WI ID extraction | Frontmatter `id: ID-09-02` under `{unit}/{subUnit}/{workItemId}` layout. | Extracted ID is `ID-09-02`; no `WI-\d+` dependency. |
| UT-WI217-L4002-004 | Product reflection scan | Product markdown contains `<!-- @work-item-id ID-09-02 -->`. | No missing reflection finding for `ID-09-02`. |

## Phase2-Extensions

| Test ID | Target | Setup | Expected |
|---|---|---|---|
| UT-WI217-L4004-001 | L4-004 target pattern derivation | Config `paths.designDocs = ".phasegate-local/product/construction"`. | Freshness use case receives `.phasegate-local/product/construction/**/*.md`. |
| UT-WI217-L4004-002 | fallback behavior | No `paths.designDocs` and no explicit pattern. | Existing default/fallback behavior remains. |
| UT-WI217-L4004-003 | explicit override | CLI supplies `--pattern "docs/**/*.md"`. | Explicit pattern is used instead of config-derived pattern. |

## Harness-API / Traceability-Model

| Test ID | Target | Setup | Expected |
|---|---|---|---|
| UT-WI217-SCAFFOLD-001 | `scaffold-wi --id` | `paths.inceptionDocs = ".phasegate-local/inception"`, command uses `--id ID-09-02`. | `description.md` is created under configured inception root with `id: ID-09-02`. |
| UT-WI217-SCAFFOLD-002 | default compatibility | Current command without new options. | Existing `docs/inception/{unit}/WI-XXX/description.md` behavior remains. |
| UT-WI217-META-001 | shared ID extractor | Non-`WI-XXX` ID is configured. | Metadata/status validators use extractor output rather than hardcoded regex. |

## Installation

| Test ID | Target | Setup | Expected |
|---|---|---|---|
| UT-WI217-INSTALL-001 | personal pre-commit template | `install --personal --apply`. | Hook contains scoped personal doc consistency invocation. |
| UT-WI217-INSTALL-002 | staged path gating | Staged file under `.phasegate-local/inception`. | Hook chooses personal consistency path. |
| UT-WI217-INSTALL-003 | non-doc staged path | Staged source-only change. | Hook does not run the personal doc consistency step unnecessarily. |
