---
traceability:
  initial_creation: true
---

# WI-170 Integration Test Design

## Test Cases

| ID | Target | Scenario | Expected |
|---|---|---|---|
| WI170-IT-001 | AJV config schema | Valid `phase2Extensions.initialCreationExpirationRules` rule in a v2 source document | No schema errors. |
| WI170-IT-002 | AJV config schema | Invalid `evaluationMode` in an initial creation expiration rule | Schema error at the rule field. |
| WI170-IT-003 | CLI command | `p2:check-initial-creation` remains listed as compatibility command | CLI reference and help describe compatibility status. |

## Verification Commands

```bash
pnpm exec vitest scripts/harness/__tests__/integration/config-foundation/ajv-config-schema-validator.test.ts scripts/harness/__tests__/integration/phase2-extensions/harness-config-initial-creation-expiration-adapter.test.ts --run
pnpm test
```
