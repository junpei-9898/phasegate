---
id: WI-118
type: issue
status: drafted
---

# WI-118 Logical Design

`MarkdownDesignDocumentAdapter.getLayerAnnotations()` is no longer empty. It reads construction docs and emits typed annotation values such as `layer:known`, `layer:unknown`, `unit:matched`, `unit:mismatch:{expected}`, and `adr:referenced`.

`ConsistencyCheckService` interprets those typed annotations instead of comparing all documents to a single layer value. ADR references are validated through `ConsistencyAdrReferencePort`.
