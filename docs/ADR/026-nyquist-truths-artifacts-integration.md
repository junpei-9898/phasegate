---
adr_id: "026"
title: "Nyquist 統合 — GSD-2 Truths/Artifacts 検証パターン"
status: Accepted
date: 2026-03-11
---

# Nyquist 統合 — GSD-2 Truths/Artifacts 検証パターン

## Context

要件から成果物へのトレーサビリティ検証は、GSD-2 における Truths/Artifacts パターンとして既に存在していた。概念的に同一の検証（要件→成果物トレーサビリティ）を phasegate 側で二重実装すると、検証ロジックが分岐し、整合性の保証が困難になる。

> §12 Key Decision: nyquist-truths-artifacts

## Decision

GSD-2 の Truths/Artifacts 検証パターンを Nyquist バリデータ（L3-004）へ統合し、再実装しない。

## Consequences

- `scripts/harness/validator-system/domain/value-objects/validator-id.ts` において `L3-004` が `nyquist` に対応づけられている。
- AC レベルのトレーサビリティアダプタが、fail-closed な L3 ゲートと advisory な L4 層の両方を提供する。同一の検証概念を一箇所へ集約することで検証の分岐を防ぐ。

関連: ADR-003（CI バリデータ / L3）、ADR-018（drift-detect ポインタ）。
