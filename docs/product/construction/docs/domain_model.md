# ドメインモデル: docs

@story-id HF2-01
<!-- @work-item-id WI-203 -->

## WI-203 User Guidance Reflection

`docs` is a legacy documentation reflection unit for public guide changes. User-visible hook guidance is modeled as public documentation content, not runtime state.

For Stop hook strict mode, the documented domain rule is:

| Concept | Meaning |
|---|---|
| Packaged Complete Check command | Built-in `phasegate:complete-check` command executed through the PhaseGate package CLI. |
| Downstream complete-check wrapper | Optional user-owned extension file under `scripts/harness/cli/`; not required by standard install/reconcile. |
| Strict-mode validation failure | Non-zero result from the canonical Complete Check command. |
| Strict-mode execution failure | Failure to invoke the command path itself, reported separately from validation failure. |

Guide updates must explain that standard projects do not need to create `scripts/harness/cli/complete-check.ts` for `agentIntegration.stopHook.enforce`.
