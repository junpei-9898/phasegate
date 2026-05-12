---
id: WI-128
type: issue
status: drafted
---

# WI-128 Logical Design: L4 operational rollout

## Policy

L4 validators are implemented and registered, but scheduled operation remains opt-in:

- default project behavior keeps `layers.L4.enabled: false`
- explicit `validate --layer L4` forces L4 execution for local audit
- `validate --layer all` and `phasegate:ci-check` preserve disabled L4 as skipped unless enabled by config/preset
- `p2:*` commands are compatibility entry points; canonical L4 execution is `validate --layer L4`

## CI Workflow

`ci:generate-template --type consistency-check --render` is the recommended source for the weekly scheduled audit workflow. The bundled workflow documents cron, validator IDs, advisory warning behavior, and strict fail-on-warning usage.

## Documentation

README, README.ja, `docs/guide/layer-model.md`, and CLI command help describe the same policy.

@work-item-id WI-128
