---
adr_id: "027"
title: "成果物駆動の状態導出"
status: Accepted
date: 2026-03-11
---

# 成果物駆動の状態導出

## Context

ハーネスの検査状態（各レイヤの健全性・フェーズゲートの状態）は再現可能であるべきである。可変な保存状態（別途書き込む state ファイル）に依存すると、実際のディスク上の成果物と state が乖離し、状態が信頼できなくなる。GSD-2 は成果物から状態を導出する優れたパターンを持っていた。

> §12 Key Decision: artifact-driven-state

## Decision

ハーネスの検査状態を、ディスク上の成果物から導出する（GSD-2 パターンの再利用）。可変な保存状態を真実源としない。

## Consequences

- `scripts/harness/harness-api/domain/services/status-derivation-service.ts` が `ArtifactScanResult` から `LayerHealth` および `HarnessStatusSummary` を導出する。
- `check-phase` / `check-ready` 系のコマンドは成果物を読んで状態を判定するため、状態が常にディスクの実態と一致し、再現可能になる。

関連: ADR-012（2-Phase Execution）、ADR-018（drift-detect ポインタ）。
