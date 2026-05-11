---
traceability:
  initial_creation: true
work_item: WI-148
---

# WI-148 integration test design

## Scenarios

| ID | Scenario | Evidence |
|---|---|---|
| IT-WI148-001 | `reconcile --dry-run --json` reports per-entry plan and does not mutate files | `dry-run は entry ごとの repairMode と diff を返し files を変化させないこと` |
| IT-WI148-002 | `reconcile --apply` updates merged managed portions and preserves user content | `apply は merged entry の PhaseGate 管理部分を更新し user 部分を保持すること` |
| IT-WI148-003 | created entry with matching manifest hash follows current template | `created entry は user 改変なしなら current template に追従すること` |
| IT-WI148-004 | created entry with user modification refuses without force and backs up on force | `created entry の user 改変は force 無しで refuse し force で backup して上書きすること` |
| IT-WI148-005 | missing deploy target is added and second apply is no-op | `manifest に無い deploy target を追加し 2 回目は no-op になること` |

## CLI dispatch checks

`main.ts` dispatch is covered by compile-time wiring and handler integration. Manual dogfood should additionally run:

```sh
npx phasegate reconcile --dry-run
npx phasegate reconcile --apply
npx phasegate update-skills --dry-run
npx phasegate init --help
```

@work-item-id WI-148
- `scripts/harness/__tests__/integration/installation/reconcile-handler.test.ts`
