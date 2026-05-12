---
id: WI-122
type: issue
status: drafted
---

# WI-122 Logical Design

Pointer validation classifies raw pointers before reporting. `file-path` pointers are refined into product docs, ADR, implementation, or reference pointers; URL pointers become `external-url`.

`ValidateDocPointersUseCase` applies `PointerRule.policyFor()` to decide whether broken pointers fail, warn, or skip. Reports include owner, semantic type, source document, severity, and next action.

Doc freshness remains threshold-based but can distinguish stable aging from age caused by related source/WI/product changes through `DocumentAgeSource`.
