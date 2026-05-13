# ドメインモデル: documentation

@story-id HF2-01
@story-id HF2-02
@work-item-id WI-116
## Public L4 Validator State

Public documentation represents the user-visible validator catalog. L4-004 `doc-freshness` and L4-005 `pointer-validation` are registered validators, while the `p2:*` commands are compatibility entry points.
<!-- @work-item-id WI-132, WI-133, WI-136, WI-137, WI-138 -->
## G4 Documentation Contract Annotations

Documentation may declare opt-in semantic contract records using `@phasegate-contract` and test observations using `@phasegate-observation`. These annotations let public docs participate in L2-015 without requiring every Markdown heading to become a contract.

<!-- @work-item-id WI-160 -->
## WI-160 Contract Traceability Documentation Model

The documentation Unit owns public explanation of the annotation syntax and finding interpretation for `L2-015`.

| Documentation concept | Semantic model |
|---|---|
| `@phasegate-contract` | Declares `PublicContract`, `BoundaryCase`, `ErrorContract`, `StateMachineModel`, or a traceability edge. |
| `@phasegate-observation` | Declares test/evidence coverage for a behavior, boundary, error path, state transition, or graph edge. |
| Behavior key | Stable semantic key for a public behavior under a contract. |
| Boundary key | Stable semantic key for edge/error/adapter behavior that needs dedicated coverage. |
| Observation key | `covers` target linking evidence to the behavior or boundary it proves. |

Public docs should link users to `docs/guide/contract-traceability.md` rather than exposing validator-system internals.

<!-- @work-item-id WI-134, WI-135 -->
## Architecture Semantic Documentation Policy

Documentation describes side-effect capability boundaries and decision-placement advisories as preset-driven architecture policy. Public guidance must present these findings as L4 advisory signals unless projects explicitly opt into warning failure.
