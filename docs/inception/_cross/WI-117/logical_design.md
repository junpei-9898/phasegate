---
id: WI-117
type: issue
status: drafted
---

# WI-117 Logical Design

`DriftDetectionService` loads normalized design/code records and compares compound keys. Existing `getElements()` ports remain as compatibility fallback, while adapters may expose `getElementRecords()` for precise Unit and file metadata.

`MarkdownDesignDocumentAdapter` reads multiple product construction docs (`domain_model.md`, `logical_design.md`, `unit_test_design.md`, `it_test_design.md`) instead of only domain models.

`BiomeAstSourceCodeAnalyzerAdapter` resolves Unit from `@unit` metadata before path fallback and records direct exports, named re-exports, wildcard re-exports, and default exports.
