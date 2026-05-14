# WI-198 Domain Model

## Managed Target Canonical Content

`ManagedTargetCanonicalContent` は install / reconcile / auto-refresh が共有する、対象 file ごとの期待内容を表す。

| Field | Meaning |
|---|---|
| `path` | Managed target path。例: `CLAUDE.md`, `AGENTS.md`, `package.json` |
| `strategy` | markdown-managed / package-json / json / shell / yaml-add |
| `content` | Comparison に使う canonical rendered content |
| `source` | Renderer provenance。install/reconcile/refresh 間で同じ renderer を指す必要がある。 |

## Idempotent Managed Update

同じ repository state に対して apply 済み command の直後に dry-run command を実行した場合、dry-run は no-op になる。

## Invariants

- `ci-governance` は agent context content を生成するが、installation lifecycle と異なる marker shape を独自に持たない。
- `installation` の reconcile planner は refresh 済み managed content を hash mismatch と誤判定しない。
- package metadata の phasegate-managed script / dependency merge は install/reconcile の責務であり、agent context refresh では不要な変更を誘発しない。
