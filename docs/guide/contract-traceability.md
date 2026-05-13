---
traceability:
  initial_creation: true
---

# Contract Traceability

<!-- @work-item-id WI-160 -->

`L2-015 contract-traceability-coverage` validates opt-in semantic records that connect public contracts to tests and product reflection.

## Annotations

Use `@phasegate-contract` on the file or section that declares a public behavior, boundary, error, state, or traceability contract. Use `@phasegate-observation` on tests or evidence that covers that contract.

```ts
// @phasegate-contract id=phasegate-status-json kind=PublicContract behaviors=hook-health,baseline-health
// @phasegate-observation covers=phasegate-status-json:hook-health kind=integration
```

The current scanner is deliberately annotation based. It avoids treating every Markdown heading or exported symbol as a public contract while keeping the domain model ready for richer AST/Markdown extractors.

## Semantic keys

| Key | Meaning |
|---|---|
| `behavior` | A required public behavior under a CLI, API, Port, config, domain, or error contract. |
| `boundary` | A boundary case such as invalid input, adapter edge, compatibility mode, or public/private API distinction. |
| `observation` | Test or other evidence that covers a behavior or boundary. |

## Model types

| Type | What it represents |
|---|---|
| `PublicContract` | CLI/API/Port/config/domain/error contract and its required behavior cases. |
| `BoundaryCase` | Edge behavior that must be covered separately from the happy path. |
| `ErrorContract` | Stable error code, severity, message, suggestion, documentation reference, exit code, and machine-readable fields. |
| `StateMachineModel` | States, transitions, terminal states, and invalid transitions. |
| `TraceabilityGraphSlice` | WI, affected Unit, product reflection, implementation evidence, test evidence, and public-doc sync status. |

## Findings

`L2-015` findings use the standard validator result contract. Important fields are:

| Field | Meaning |
|---|---|
| `kind` | Finding class such as missing behavior observation, missing boundary observation, incomplete error contract, state transition gap, or traceability graph gap. |
| `subject` | Contract, behavior, error, state, or WI graph node that needs attention. |
| `sourcePath` | File where the contract or observation was collected. |
| `severity` | Current policy severity for the finding. |
| `suggestion` | Repair action, usually adding an observation, completing an error contract, or reflecting a WI edge. |

## WI-133 severity policy

WI-133 made boundary/error/traceability coverage severity configurable at the validator policy layer. It is implemented as validator-system policy behavior, not as a new top-level `phasegate.config.json` field. Treat additional user-facing severity knobs as follow-up work unless the schema explicitly documents them.
