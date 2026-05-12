---
id: WI-117
type: issue
status: drafted
---

# WI-117 Unit Test Design

- `DriftDetectionService` detects missing code when the same element exists in multiple Units but only one Unit implements it.
- Pointer matching does not hide unrelated exports in the same source file.
- Existing name-different single-file pointer compatibility remains covered by legacy pointer tests.
