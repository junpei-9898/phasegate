# WI-136 Unit Test Design

@work-item-id WI-136

| Case | Target | Expected |
|---|---|---|
| UT-G4-136-001 | docs/code state mismatch | Reports `state-doc-code-mismatch` |
| UT-G4-136-002 | terminal outgoing transition | Reports `state-invalid-terminal-transition` |
| UT-G4-136-003 | transition without observation | Reports `missing-transition-test` |
