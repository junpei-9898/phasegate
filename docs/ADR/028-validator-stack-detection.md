---
adr_id: "028"
title: "バリデータ無限ループ防止 — スタック検出"
status: Accepted
date: 2026-03-11
---

# バリデータ無限ループ防止 — スタック検出

## Context

同一の `HarnessError` が繰り返し発生する状況では、バリデータとエージェントの間で自己修正ループが無限に回り、エージェントのサイクルを浪費する。GSD-2 のスタック検出パターンは、この種の反復を検出して打ち切る仕組みを持っていた。

> §12 Key Decision: validator-stack-detection

## Decision

同一 `HarnessError` の繰り返しを検出し、閾値を超えた場合に自動エスカレーションする（GSD-2 スタック検出パターンの応用）。

## Consequences

- `ci-governance` ユニット（H13-02）で実装済み。`RepetitionDetector`、`RecordErrorOccurrenceUseCase`、`CheckEscalationUseCase`、エスカレーションログにより、同一エラーの反復を検出しエスカレーションする。
- 加えて stop-hook の `ReentryGuard`（`agent-integration` ユニット）がフックの再入ループを防止する。
- **STATUS NOTE**: §12 は当初この決定を "Pending" としていたが、実装が完了しているため本 ADR は Accepted とする。§12 側の Status も本作業（WI-230 Step 3）で "Decided" に訂正した。

関連: ADR-003（CI バリデータ）、ADR-004（scheduled バリデータ）。
