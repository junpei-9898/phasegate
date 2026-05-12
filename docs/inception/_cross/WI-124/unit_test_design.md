---
id: WI-124
type: issue
status: drafted
---

# WI-124 Unit Test Design

| ID | Target | Scenario | Expected |
| --- | --- | --- | --- |
| UT-WI124-REG-001 | `ValidatorIdRegistryAdapter` | `listAll()` | returns live validator-system IDs, including L4-004/L4-005 and no stub `v1` values |
| UT-WI124-REG-002 | `ValidatorIdRegistryAdapter` | `listForPreset('standard','aidlc-gate')` | returns L2/L3 IDs and excludes L4 |
| UT-WI124-REG-003 | `ValidatorIdRegistryAdapter` | `listForPreset('strict','aidlc-gate')` | includes L2/L3/L4 IDs |
| UT-WI124-TG-001 | `TemplateGenerator` | port has `listForPreset` | generator uses preset-aware registry method |
| IT-WI124-CLI-001 | CLI | `ci:generate-template --preset standard --type aidlc-gate --json` | target validator IDs match expected live standard surface |

@work-item-id WI-124
