# WI-138 Unit Test Design

@work-item-id WI-138

| Case | Target | Expected |
|---|---|---|
| UT-G4-138-001 | affected unit missing product reflection | Reports `traceability-unit-mismatch` |
| UT-G4-138-002 | implementation without same-WI test | Reports `traceability-test-mismatch` |
| UT-G4-138-003 | public docs changed without contract change | Reports `public-doc-contract-sync` |
