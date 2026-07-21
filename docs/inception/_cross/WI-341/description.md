---
id: WI-341
type: fix
severity: normal
status: drafted
affects: [skill-quality]
source: bug sweep v0.292.0 (2026-07-21) Bug#3(新規10件中)
---

# WI-341: skill:check-coverage の matrix スキーマ producer/consumer 分裂修正

<!-- @work-item-id WI-341 -->

## 背景

matrix adapter がトップレベル辞書 `{storyId: {total, covered, uncoveredIds}}` を仮定する一方、producer(`phasegate:generate-matrix`)の実出力は `{version, generatedAt, stories: [...]}`(RequirementTestMatrixDto)。この分裂により `skill:check-coverage` は generate-matrix の実ファイルに対して常に "Story not found" で失敗する。

## 修正

adapter を stories 配列形式対応(total = AC 数 / covered = testReferences ≥1 の AC 数 / uncoveredIds 導出)にし、旧形式は後方互換維持。`--json` 指定時のエラー出力も JSON 化。
