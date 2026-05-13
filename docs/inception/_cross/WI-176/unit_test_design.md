---
traceability:
  initial_creation: true
---

# WI-176 Unit Test Design

<!-- @work-item-id WI-176 -->

The initial implementation keeps readiness construction inside the CLI module, so direct unit coverage is deferred until setup planning is extracted from `main.ts`. The required behavior is covered through integration-level CLI tests because the observable contract is JSON output.

Future extraction should add pure tests for:

| Case ID | Subject | Input | Expectation |
|---|---|---|---|
| UT-WI176-001 | agent readiness builder | `--agent claude`, no files | Claude planned, Codex not-applicable, shared planned |
| UT-WI176-002 | agent readiness builder | all selected Claude files present | Claude configured |
| UT-WI176-003 | agent readiness builder | `--agent both`, Codex files missing | Codex planned with user-level hook risk |
| UT-WI176-004 | shared readiness | CI selected but workflow missing | shared planned with hosted CI risk |
