# WI-143 Domain Model

<!-- @work-item-id WI-143 -->

## Concepts

| Concept | Responsibility |
|---|---|
| WI directory | Canonical work item root, `docs/inception/{unit}/WI-XXX/` or `docs/inception/_cross/WI-XXX/` |
| Ad-hoc plan | Plan-like inception file not owned by a WI directory |
| Workflow drift finding | Doctor diagnostic that explains WI count, ad-hoc plan count, and repair command |
| Strict workflow mode | Init option that removes phase-gate relaxation and limits quick mode to chore-only changes |
| Agent rules block | Generated markdown guidance for external agent instruction files |

## Invariants

- A plan/design workflow is considered structurally healthy only when new plan artifacts are owned by a WI directory.
- A repository with zero WI directories and one or more ad-hoc plans is not silently acceptable; `doctor` must surface it.
- Strict workflow config must not include `phase-gate` in `quickMode.relaxedGates`.
- `scaffold-wi` must allocate the next globally unused WI number under `docs/inception/**`.

