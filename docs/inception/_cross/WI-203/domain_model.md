# WI-203 Domain Model: stop hook complete-check command ownership

<!-- @work-item-id WI-203 -->

## 用語

| Term | Definition |
|------|------------|
| Stop Hook | agent session end 時に呼ばれる hook。ReentryGuard と Complete Check を実行する。 |
| Complete Check | `phasegate:complete-check` canonical command。lint と L2-L4 validator を統合実行する。 |
| Command Adapter | application use case が要求した command name を OS process に変換する infrastructure adapter。 |
| Managed Wrapper | install/reconcile が project に生成し、PhaseGate が管理する薄い script。 |
| Execution Wiring Failure | validation failure ではなく、command path missing / spawn failure / dependency missing など実行配線の失敗。 |

## Invariants

- Stop Hook domain/application は Complete Check を `phasegate:complete-check` として表現する。
- `phasegate:complete-check` は harness-api が所有する public command であり、project-local wrapper の存在を暗黙必須にしてはならない。
- strict mode の block は validation failure と execution wiring failure を観測可能に区別する。
- install/reconcile が管理対象として宣言しない file を、hook runtime が必須依存として参照してはならない。

## Boundary Ownership

| Boundary | Owns | Must Not Own |
|----------|------|--------------|
| agent-integration | Hook orchestration, ReentryGuard, command execution request, strict block UX | harness-api command implementation |
| harness-api | `phasegate:complete-check` command dispatch and result semantics | project-local hook wrapper generation |
| installation | Managed target generation/reconcile/doctor setup diagnosis | Stop Hook runtime fallback logic |

## Failure Classification

| Failure | Example | User-facing treatment |
|---------|---------|-----------------------|
| Validation failure | L2 metadata validator fails | strict mode block with Complete Check failed |
| Wiring failure | `scripts/harness/cli/complete-check.ts` missing | explicit setup/runtime error with recovery hint |
| Reentry skip | `HARNESS_STOP_HOOK_ACTIVE=1` | exit 0, no block |
