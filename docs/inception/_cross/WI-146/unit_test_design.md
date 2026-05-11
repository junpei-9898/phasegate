---
traceability:
  initial_creation: true
work_item: WI-146
---

# Unit Test Design: WI-146

@work-item-id WI-146

| ID | Target | Case | Expected |
|---|---|---|---|
| UT-WI146-JSON-001 | JSON merge strategy | Existing hook entries plus template phasegate hooks | Existing entries are retained and phasegate entries are appended once |
| UT-WI146-JSON-002 | JSON merge strategy | Existing permissions deny plus template deny | Union merge without duplicates |
| UT-WI146-SH-001 | Shell merge strategy | Existing script without phasegate block | Managed block is appended after existing content |
| UT-WI146-SH-002 | Shell merge strategy | Existing script with old managed block | Only managed block is replaced |
| UT-WI146-PKG-001 | package.json merge | Existing package without phasegate | devDependency and helper scripts are added |
| UT-WI146-PKG-002 | package.json merge | Existing helper script | Existing script value is not overwritten |

## Notes

@work-item-id WI-146

The tests cover merge behavior directly rather than CLI formatting details. CLI behavior is covered by integration tests.
