---
traceability:
  initial_creation: true
work_item: WI-147
---

# WI-147 unit test design

@work-item-id WI-147

## Reverse logic

| ID | Target | Arrange | Assert |
|---|---|---|---|
| UT-WI147-001 | JSON reverse | user hook + phasegate template hook を含む settings JSON | phasegate hook と deny だけ消え、user hook は残る |
| UT-WI147-002 | Shell reverse | user shell + managed BEGIN/END block | managed block だけ消え、user shell は残る |
| UT-WI147-003 | package.json reverse | user script + `phasegate:*` scripts + devDependency | phasegate entries だけ消え、user script は残る |
| UT-WI147-004 | RepairMode | hash mismatch created entry | `ai-assisted` かつ skill hint を返す |

## Manifest repository

| ID | Target | Arrange | Assert |
|---|---|---|---|
| UT-WI147-005 | archive | `.phasegate/manifest.json` が存在 | `uninstalled-*.json` に rename され manifest は消える |
