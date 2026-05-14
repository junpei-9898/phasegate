# WI-191 Logical Design

## Scope

Strict retrofit projects need an agent-readable escape hatch without weakening protected-file hooks. The CLI should expose a reviewable configuration patch instead of editing `phasegate.config.json` directly.

## Design

- Add `manual` as a valid `planningMode` value. Manual mode treats plan evidence as externally reviewed and does not require QA sections or answered QA.
- Add `config:plan --intent retrofit-bootstrap`, which previews:
  - `planningMode.default = "manual"`
  - `phaseDependencies.override = true`
  - `quickMode.relaxedGates = ["phase-gate"]`
- Add `config:plan --intent planning-mode-relax`, which only previews `planningMode.default = "manual"`.
- Update phase-gate blocker wording so planning evidence mismatch is distinct from missing QA content.

## Verification

- Config schema and value-object tests accept `manual`.
- `config:plan --intent retrofit-bootstrap --json` returns explicit JSON patch operations for review.
