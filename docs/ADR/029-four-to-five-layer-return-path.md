---
adr_id: "029"
title: "L0 4層→5層復帰パス"
status: Accepted
date: 2026-03-11
---

# L0 4層→5層復帰パス

## Context

FUSE ベースの L0 を v1 スコープ外へ defer した（ADR-025）ため、非交渉要件 K1 を一時的に 4 層（L1-L4）で定義した。将来 L0 を追加した際に既存の 4 層定義が障害とならないよう、4層から 5層への拡張パスをあらかじめ明示しておく必要があった。

> §12 Key Decision: four-to-five-layer-path

## Decision

4層→5層の拡張パスを明示的に定義する。将来の L0 追加を阻害しない形で K1 の層構造を段階的に拡張できるようにする。

## Consequences

- 5層への復帰は既に達成されている。`docs/guide/layer-model.md` は現在 "5-Layer Defense Model (L0-L4)" を記述し、L0 は FUSE ではなく hooks engine（`agent-integration` + Husky）として実現されている（ADR-025）。
- 一方で ADR-001（"four-layer-defense-model"、K1=4層）は 5層の現実に遅れている。ADR-001 の見直しは本作業のスコープ外であり、follow-up として別途行う必要がある。

関連: ADR-001（4層防御モデル）、ADR-025（FUSE Hooks Engine は v1 スコープ外）。
