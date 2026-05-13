---
traceability:
  initial_creation: true
---

# WI-175 Logical Design

<!-- @work-item-id WI-175 -->

## Design Scope

WI-175 extends the existing `setup:agent`, `config:plan`, and install apply surfaces so an agent can explain setup completeness before and after mutation.

The design keeps `setup:agent` and `config:plan` as planning-first CLI surfaces:

- `setup:agent` reports detected local state, planned managed targets, readiness evidence, remaining manual checks, and validation commands.
- `config:plan` reports concrete `phasegate.config.json` before/after changes where the intent touches local config.
- install apply failures are converted into structured target-aware errors instead of raw Node filesystem failures.

## CLI Contract Additions

### `setup:agent`

The JSON result gains `plan.completeness`, an ordered list of setup areas:

| Field | Meaning |
|---|---|
| `area` | Stable setup area id such as `local-config`, `agent-hooks`, `agent-context`, `skills`, `git-hooks`, `ci`, `validation`, `external-actions` |
| `status` | `configured`, `planned`, `manual`, `not-applicable`, or `unknown` |
| `evidence` | Human-readable evidence that explains why the status was assigned |
| `nextAction` | Concrete next action, or `null` when no action remains |
| `risk` | Residual risk, or `null` |

The existing `changes`, `risks`, `rollback`, and `validation` arrays remain stable.

### `config:plan`

The JSON result gains:

- `managedTargets`: local managed files or directories handled by PhaseGate commands.
- `externalActions`: user-level or remote actions that cannot be proven from local files.
- `configPatch`: a read-only preview for `phasegate.config.json`.

`configPatch` uses JSON pointer style paths and contains `before`, `after`, and `operations`. It is `null` when the selected intent has no local config mutation.

### Install Apply Failure Mapping

Install write failures are represented as:

- `target`: relative managed target path
- `operation`: `mkdir`, `writeFile`, `chmod`, `symlink`, or `manifest-save`
- `code`: filesystem error code when available
- `likelyCause`: concise explanation
- `recovery`: concrete retry or permission guidance
- `partialChanges`: paths already changed in the current apply run

## Readiness Boundary

Local readiness is based only on repository files PhaseGate can inspect or create. External readiness is exposed as manual checks and must not silently turn `doctor` green into a claim that Codex feature flags, GitHub Actions execution, or registry state are complete.

## Default Alignment

`setup:agent --intent strict` and direct `install --agent both --with-ci --with-husky` should render the same managed agent context when the same workflow, agent, skill set, Husky, and CI values are used.

The lower-level `install` command remains explicit. Any intentional difference between setup intent and direct install must be reflected in the setup plan rather than hidden as drift.
