---
traceability:
  initial_creation: true
work_item: WI-148
---

# WI-148 coverage report

## Acceptance mapping

| Acceptance criterion | Evidence |
|---|---|
| `reconcile --dry-run` displays per-entry diff | IT-WI148-001 |
| `reconcile --apply` updates merged managed block and preserves user content | IT-WI148-002 |
| created entry follows template when unmodified | IT-WI148-003 |
| created entry with user modification warns/skips unless `--force` | IT-WI148-004 |
| new deploy target is added like install | IT-WI148-005 |
| manifest updates to new version/hash | IT-WI148-002 / IT-WI148-005 |
| `update-skills` remains compatible alias | `scripts/harness/main.ts` dispatch to `reconcileHandler` |
| `init` deprecation warning | `scripts/harness/main.ts` warning before legacy init behavior |
| second reconcile is no-op | IT-WI148-005 |
| RepairMode is reported per entry | IT-WI148-001 |
| ai-assisted entries refuse on apply without force | IT-WI148-004 |

## Verification commands

```sh
pnpm exec vitest run scripts/harness/__tests__/integration/installation/reconcile-handler.test.ts scripts/harness/__tests__/integration/installation/install-handler.test.ts scripts/harness/__tests__/integration/installation/uninstall-handler.test.ts
pnpm exec tsc --noEmit
```

Both commands passed locally during WI-148 implementation.

@work-item-id WI-148
- `scripts/harness/installation/application/usecases/run-reconcile.ts`
- `scripts/harness/installation/presentation/cli/reconcile-handler.ts`
- `scripts/harness/__tests__/integration/installation/reconcile-handler.test.ts`
