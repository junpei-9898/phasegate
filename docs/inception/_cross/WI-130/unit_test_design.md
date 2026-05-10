# WI-130 Unit Test Design

<!-- @work-item-id WI-130 -->

## Cases

| ID | Case | Expected |
|---|---|---|
| UT-WI130-001 | `expect(actual).toBeTruthy()` | weak truthiness warning |
| UT-WI130-002 | `expect(actual).toMatchSnapshot()` only | snapshot-only warning |
| UT-WI130-003 | `expect(actual).toHaveLength(1)` only | length-only warning |
| UT-WI130-004 | `expect(port.execute).toHaveBeenCalledTimes(1)` only | interaction-only warning |
| UT-WI130-005 | `expect(actual).toThrow()` without contract detail | error-contract warning |
| UT-WI130-006 | exact value or shape assertion against actual | passes |

