# WI-109 Logical Design

<!-- @work-item-id WI-109 -->

## Boundary Correction

PhaseGate self-lint failed because an integration entrypoint depended on a config-foundation infrastructure repository class. The correction keeps `pre-commit.ts` at the harness-api presentation boundary and avoids importing concrete infrastructure errors across Unit boundaries.

## Unit Ownership Fallback

`TypeScriptSourceModuleAnalyzerAdapter` can derive a file's Unit from standard PhaseGate paths when `@unit` metadata is absent. This is a fallback only; explicit metadata still wins.

