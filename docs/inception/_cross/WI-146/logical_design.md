---
traceability:
  initial_creation: true
work_item: WI-146
---

# Logical Design: WI-146 phasegate install structured merge

> **WI**: WI-146
> **Unit**: installation
> **作成日**: 2026-05-11
> **関連 product 設計**: `docs/product/units/installation_unit.md` §3.4

## Scope

@work-item-id WI-146

`phasegate install` を WI-145 の manifest / doctor 基盤上に追加する。既存 `init` の silent skip を解消するため、既存 deploy 先は overwrite せず structured merge し、結果を `.phasegate/manifest.json` に `created` / `merged` 区別付きで記録する。

## Command Contract

@work-item-id WI-146

- `phasegate install --dry-run`: deploy target ごとの action (`missing` / `will-merge` / `will-skip` / `will-overwrite`) と `RepairMode`、簡易 diff summary を表示する。
- `phasegate install --apply`: `mechanical` target を作成または merge し、manifest を保存する。`ai-assisted` target は force 無しでは refuse する。
- `phasegate install --force`: `ai-assisted` target と既存 managed block 置換を許可し、変更前ファイルを `.phasegate/backups/{timestamp}/` に保存する。

## Merge Targets

@work-item-id WI-146

| Target | Strategy | Manifest mode |
|---|---|---|
| `.claude/settings.json` | JSON hook / permissions union merge | `created` or `merged` |
| `.codex/hooks.json` | JSON hook union merge | `created` or `merged` |
| `.husky/pre-commit` | shell managed block append / replace | `created` or `merged` |
| `.husky/commit-msg` | shell managed block append / replace | `created` or `merged` |
| `.husky/pre-push` | shell managed block append / replace | `created` or `merged` |
| `.github/workflows/phasegate-aidlc-gate.yml` | YAML add as separate workflow file | `created` |
| `package.json` | `devDependencies.phasegate` and `scripts.phasegate:*` merge | `created` or `merged` |

## Idempotency

@work-item-id WI-146

Each strategy is content-based. A second `install --apply` over the same project must produce identical target hashes and manifest entry hashes. Manifest entry timestamps are preserved for unchanged entries by reusing existing entries when hashes match.
