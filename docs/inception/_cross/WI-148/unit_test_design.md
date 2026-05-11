---
traceability:
  initial_creation: true
work_item: WI-148
---

# WI-148 unit test design

## Target behavior

本 WI の主リスクは use case orchestration と filesystem side effects の組み合わせにあるため、pure unit より integration test を主証跡にする。helper-level の JSON / shell / package merge は `RunReconcileUseCase` 内に閉じ、public behavior で固定する。

## Unit-level assertions

| ID | Target | Scenario | Expected |
|---|---|---|---|
| UT-WI148-001 | target planning | manifest missing | manual `missing-manifest` plan |
| UT-WI148-002 | JSON reconcile | phasegate hook entries changed | user entries preserved, managed entries replaced |
| UT-WI148-003 | shell reconcile | managed block exists | block only replaced |
| UT-WI148-004 | package reconcile | version upgrade | user scripts/devDeps preserved, phasegate version updated |
| UT-WI148-005 | changed target | hash mismatch | ai-assisted + skill hint |

## Implemented coverage

UT-WI148-002〜005 は integration test で filesystem と manifest hash を含めて検証する。UT-WI148-001 は handler JSON output の missing-manifest path として将来追加可能だが、本実装では acceptance の主対象外。

@work-item-id WI-148
- `scripts/harness/__tests__/integration/installation/reconcile-handler.test.ts`
