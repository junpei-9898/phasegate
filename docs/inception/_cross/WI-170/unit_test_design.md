---
traceability:
  initial_creation: true
---

# WI-170 Unit Test Design

## Focus

The rule loader behavior is already covered by phase2-extensions adapter tests. WI-170 adds no new domain branch, so unit scope is limited to preserving typed config shape.

## Existing Coverage

| Test | Coverage |
|---|---|
| `harness-config-initial-creation-expiration-adapter.test.ts` | Loads multiple configured rules, defaults when config is omitted, and preserves `enabled:false`. |

## Added Unit Risk

No additional unit tests are required unless implementation changes rule construction. Schema acceptance is integration-level because it relies on AJV and packaged schema files.
