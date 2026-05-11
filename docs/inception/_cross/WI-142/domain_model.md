# WI-142 Domain Model

<!-- @work-item-id WI-142 -->

## Concepts

| Concept | Responsibility |
|---|---|
| CLI omitted preset | Absence of `--preset` at the command boundary |
| Standard preset | Public default preset for CI template generation |
| Template type | Concrete template selector such as `agent-context-refresh` |

## Invariants

- Omitted `--preset` is normalized to `standard` before calling the ci-governance handler.
- The domain preset registry does not need a synthetic `default` preset.
- Help and CLI reference must describe `standard` as the default.

