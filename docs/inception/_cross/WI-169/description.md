---
id: WI-169
type: issue
severity: high
status: drafted
affects: [installation, harness-api, setup, integrations, agent-integration, ci-governance]
source: internal
---

# WI-169: Installation Lifecycle Product Construction Completion

> 起票日: 2026-05-12
> 起票経緯: WI-145..148 の install / doctor / uninstall / reconcile を product construction 正本へ完全に戻すため。

## スコープ

- `docs/product/construction/installation/*`
- `docs/product/construction/harness-api/*`
- `docs/product/construction/setup/*`
- `docs/product/construction/integrations/*`
- `docs/product/construction/agent-integration/*`
- `docs/product/construction/ci-governance/*`
- doctor checks: `wi-workflow-drift`, manifest parse error, report-out behavior, repair table

## 受け入れ基準

- [x] doctor check 数、repairMode / repairHint / suggestedSkill、manifest parse error の扱いが product docs と実装で一致する。
- [x] install / reconcile が実際に管理する target と docs が説明する target が一致する。
- [x] `future`, `stub`, `wrapper`, `TODO` が残る場合は、実装済み仕様か follow-up かが明確。

## 反映

- `docs/product/construction/installation/domain_model.md`
- `docs/product/construction/installation/logical_design.md`
- `docs/product/construction/installation/*test*.md`
- `docs/product/construction/setup/logical_design.md`
- `docs/guide/setup-artifacts.md`

## 依存

`WI-152`, `WI-153` と語彙を合わせる。
