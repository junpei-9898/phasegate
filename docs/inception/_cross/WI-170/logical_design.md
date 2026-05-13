---
traceability:
  initial_creation: true
---

# WI-170 Logical Design

## Scope

Expose `phase2Extensions.initialCreationExpirationRules` as a schema-validated compatibility config section without changing the existing check algorithm.

## Changes

| Area | Design |
|---|---|
| Config schema | Add optional top-level `phase2Extensions.initialCreationExpirationRules` to v2 and v3 schemas. |
| Config DTO | Preserve the optional `phase2Extensions` section on `HarnessConfigV2` so `buildPhase2Extensions()` can consume resolved config with types. |
| CLI docs | Keep `p2:check-initial-creation` in the Phase 2 Extensions table as a compatibility command. |
| Configuration guide | Document the rule fields, defaults, and the `initial_creation:true` lifecycle policy. |
| Product docs | Reflect the same public compatibility contract in config-foundation and phase2-extensions construction docs. |

## Non-Goals

- Promote `p2:check-initial-creation` above `validate --layer L4`.
- Add a new L4 validator in this WI.
- Change expiration detection semantics.
