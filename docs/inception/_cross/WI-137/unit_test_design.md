# WI-137 Unit Test Design

@work-item-id WI-137

| Case | Target | Expected |
|---|---|---|
| UT-G4-137-001 | incomplete `ErrorContract` | Reports `error-contract-shape` |
| UT-G4-137-002 | warning with exit code 1 | Reports `error-contract-exit-code` |
| UT-G4-137-003 | no `{id}:error-path` observation | Reports `missing-error-path-test` |
