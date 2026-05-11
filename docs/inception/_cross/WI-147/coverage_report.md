---
traceability:
  initial_creation: true
work_item: WI-147
---

# WI-147 coverage report

@work-item-id WI-147

| Acceptance | Evidence |
|---|---|
| dry-run lists manifest entries | `install-handler/uninstall-handler` integration tests |
| created deletion and hash mismatch refuse/force | `uninstall-handler` integration tests |
| merged JSON / shell / package reverse keeps user content | `run-uninstall` unit tests and integration tests |
| manifest archive | repository adapter test and integration tests |
| L1/L2 pass | `pnpm harness:check-ready` before push |
