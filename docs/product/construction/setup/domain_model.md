# ドメインモデル: setup

@story-id H09-01
Setup configuration planning defines managed config mutation concepts and workflow defaults.
@work-item-id WI-202
@work-item-id WI-204
@work-item-id WI-214

## Scope

setup unit owns PhaseGate installation and configuration change planning surfaces that mutate or guide project setup state.

## Concepts

| Concept | Definition |
|---|---|
| Strict Workflow Init | `phasegate init --workflow strict` generated configuration. It keeps gate relaxation strict through `quickMode.relaxedGates: []` while preserving the supported low-risk Quick Mode categories. |
| Config Change Intent | Stable operator intent accepted by `config:plan`, such as `quick-mode-strict` or `quick-mode-relax`. |
| Managed Config Patch | A `config:plan` patch whose target is `phasegate.config.json` and whose mutation is applied by PhaseGate CLI rather than direct editor writes. |
| Quick Mode Relax Recovery | The managed recovery path that restores `quickMode.allowedCategories` to `bugfix`, `docs`, `test`, and `config` after category narrowing blocks normal Quick Mode work. |
| Codex Hooks Feature Flag | The user-level Codex CLI feature flag that enables native hook execution. PhaseGate setup guidance uses the canonical `hooks` flag name; `codex_hooks` is treated as a legacy alias only. @work-item-id WI-205 |

## Invariants

- Strict workflow init must not emit unsupported Quick Mode category names.
- `quick-mode-strict` may narrow `quickMode.allowedCategories`, but the narrowing must remain inside supported Quick Mode categories.
- Any narrowing path must have a managed relaxation path that can restore the supported category set.
- Config doctor and hook guidance must point to managed config plans when a supported intent exists.
- Codex setup guidance must recommend `codex features enable hooks` and `[features] hooks = true`.
