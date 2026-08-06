---
id: WI-370
type: chore
severity: normal
status: drafted
affects: [ci-governance]
source: GitHub issue #42（story-implementor Phase 1 の設計文書一式）
---

# WI-370: issue #42 story の Phase 1 設計文書整備

<!-- @work-item-id WI-370 -->

## 目的

WI-367 / WI-368 / WI-369 は `scripts/harness/` 配下への新規実装を伴うため、
story-implementor の Phase 1（計画・設計）成果物を先に確定させる。

## 成果物

- `docs/inception/ci-governance/WI-367/logical_design.md` — ストーリー固有論理設計
- `docs/inception/ci-governance/WI-367/scenario_test_design.md` — シナリオテスト設計
- `docs/inception/ci-governance/WI-367/tdd_implementation_plan.md` — TDD 実装計画
- `docs/inception/ci-governance/WI-36{7,8,9}/description.md` — Work-Item 記述

## 備考

`WI-367` ディレクトリを 3 WI 共通のストーリールートとして扱う
（3 件は同一の CLI サーフェス拡張として不可分に設計される）。
