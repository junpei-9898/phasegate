---
id: WI-343
type: fix
severity: trivial
status: implemented
affects: [installation]
source: bug sweep v0.292.0 (2026-07-21) Bug#10
---

# WI-343: doctor claude-context-missing の target 誤誘導と case-sensitive 照合の修正

<!-- @work-item-id WI-343 -->

## 背景

claude-context-missing-check.ts の finding target が常に `.claude/CLAUDE.md` で、project mode の実際の修復先(ルート CLAUDE.md)と食い違い誤誘導する。また "PhaseGate" リテラルの case-sensitive 照合により、"Phasegate" 表記のみの正当な CLAUDE.md が false positive で red になる。

## 修正

照合を case-insensitive 化し、finding target を mechanical repair 側の実際の書き込み先と整合させて出し分ける。
