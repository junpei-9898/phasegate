---
id: WI-166
type: issue
severity: high
status: drafted
affects: [agent-integration, harness-api, setup, documentation]
source: internal
---

# WI-166: Agent Hook Skip Observability Product Reflection Completion

> 起票日: 2026-05-12
> 起票経緯: WI-123 の hook skip observability を agent-integration product docs に完全反映するため。

## スコープ

- `HookSkipEvent`
- recording port
- `.phasegate/hook-skip-events.jsonl` schema
- best-effort failure behavior
- PostToolUse / Stop hook tests
- apply_patch bypass public docs backstop
- SessionStart / UserPromptSubmit を含む Claude / Codex hook coverage 差分
- setup docs / skills から hook skip events を診断に使う手順

## 主要成果物

- `docs/product/construction/agent-integration/domain_model.md`
- `docs/product/construction/agent-integration/logical_design.md`
- `docs/product/construction/agent-integration/unit_test_design.md`
- `docs/product/construction/agent-integration/it_test_design.md`
- `docs/product/construction/agent-integration/coverage_report.md`

## 受け入れ基準

- [ ] logical_design 1 段落だけでなく domain / test / coverage に WI-123 が追える。
- [ ] harness-api の status schema と同じ hook skip record を参照する。
- [ ] public operational docs でも `.phasegate/hook-skip-events.jsonl` の目的、限界、改善アクションが辿れる。

## 依存

`WI-162` と整合する。
