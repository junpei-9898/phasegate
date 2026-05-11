---
traceability:
  initial_creation: true
work_item: WI-147
---

# WI-147 integration test design

@work-item-id WI-147

## CLI scenarios

| ID | Scenario | Assertions |
|---|---|---|
| IT-WI147-001 | `install --apply` 後に `uninstall --dry-run --json` | manifest entries 由来の削除 plan が列挙され、files は変化しない |
| IT-WI147-002 | `install --apply` 後に `uninstall --apply --json` | created files / symlinks は消え、merged user content は残り、manifest は archive される |
| IT-WI147-003 | created entry を user が改変後に `uninstall --apply` | force なしでは refuse して対象を残す |
| IT-WI147-004 | 同じ fixture で `uninstall --force` | backup を作成して対象を削除し manifest を archive する |
