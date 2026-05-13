---
traceability:
  initial_creation: true
---

# WI-175 Unit Test Design

<!-- @work-item-id WI-175 -->

## Targeted Cases

| ID | Target | Scenario | Expected |
|---|---|---|---|
| UT-WI175-001 | setup completeness builder | strict + both agents + Husky + CI in empty project | local targets are `planned`, external actions are `manual` |
| UT-WI175-002 | setup completeness builder | existing config/context/hooks/workflow | relevant areas become `configured` |
| UT-WI175-003 | config patch builder | `l4-strict` with no config | patch has `before: null`, `after.layers.L4.failOnWarning: true` |
| UT-WI175-004 | config patch builder | `codex-hooks` | `configPatch` is not applicable and Codex feature enablement is an external action |
| UT-WI175-005 | permission mapper | `EPERM` on `.codex/hooks.json` write | error includes target, operation, recovery, and partial changes |
| UT-WI175-006 | setup/install defaults | direct install and setup strict use same context rendering options | no managed markdown drift for equivalent options |

## Coverage Notes

The existing integration test around `setup:agent` and `config:plan` remains the primary CLI contract test. Unit coverage should be introduced when helper functions are split from `main.ts`; until then, the integration test validates the public JSON contract.
