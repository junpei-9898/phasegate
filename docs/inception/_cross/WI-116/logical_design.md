# WI-116 Logical Design

## Scope

Public documentation must not describe L4-004 `doc-freshness` and L4-005 `pointer-validation` as future unimplemented validators after they are registered.

## Design

README and guide docs describe L4-004/L4-005 as registered L4 validators and keep the `p2:*` commands as compatibility entry points. Roadmap text moves remaining work to operational rollout, not validator registration.

`validator-system` remains the source of registered L4 validator IDs. Documentation must agree with `list-errors --layer L4` and the validator registry.

## Documentation Contract

English and Japanese README entries must express the same state: L4-004/L4-005 are implemented and registered, compatibility commands remain available, and remaining roadmap scope is operational polish only.

