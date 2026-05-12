# WI-151 Logical Design: Layer Status Drift Semantics Guide

@work-item-id WI-151

## Change Strategy

Document status and drift semantics where users make operational decisions: README, CLI reference, layer guide, and harness-api product contracts. Do not change validator behavior in this WI.

## Semantics

- `configurationState` describes resolved config intent.
- `cachedArtifactState` describes persisted artifact/report availability.
- `liveValidationState` describes the current check result.
- `missing` means required evidence or artifact is absent.
- `limitation` means the detector cannot prove a condition with current coverage.
- L4 warning findings remain advisory unless warning strictness is explicitly enabled.

## Touched Surfaces

- `README.md`
- `docs/guide/cli-reference.md`
- `docs/guide/layer-model.md`
- `docs/product/units/harness-api_unit.md`
- `docs/product/units/harness_api_unit.md`
- `docs/product/units/integration_contract.md`

