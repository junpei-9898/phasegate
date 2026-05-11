# WI-109 Domain Model

<!-- @work-item-id WI-109 -->

| Concept | Responsibility |
|---|---|
| Integration entrypoint | CLI/hook boundary that may compose use cases but must not import foreign infrastructure internals |
| Unit ownership fallback | Path-derived Unit metadata for PhaseGate's own standard tree |
| Self-lint baseline | Requirement that PhaseGate repository passes its own lint/complete-check gates |

## Invariants

- Presentation/integration code may depend on composition/application contracts, not foreign infrastructure concrete classes.
- Path-derived Unit ownership is a compatibility fallback, not a replacement for explicit `@unit`.
- `phasegate:lint` and `phasegate:complete-check` must be usable as clean release gates for PhaseGate itself.

