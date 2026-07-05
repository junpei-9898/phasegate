---
adr_id: "008"
title: "Quick Mode の適用条件と範囲"
status: Accepted
date: 2026-03-24
---

# Quick Mode の適用条件と範囲

## Context

1行のバグ修正にフルハーネス（設計文書作成 → テスト設計 → Phase Gate）を要求すると、開発速度が不必要に低下する。一方で、品質ゲートの緩和を安易に拡大すると品質基盤が形骸化する。

> §12 Key Decision: quick-mode-eligibility

## Decision

Quick Mode として明確に定義された条件下でのみ、ハーネスの一部を緩和する。

### 適用条件

| 適用（Quick Mode 可） | 除外（フルハーネス必須） |
|----------------------|----------------------|
| バグ修正 | 新機能追加 |
| ドキュメント修正 | API 契約変更 |
| テスト追加 | 新ドメインモデル追加 |
| 設定変更 | レイヤー構造の変更 |

### 緩和範囲

| レイヤー | 通常モード | Quick Mode |
|---------|----------|-----------|
| L1 | 全8ルール | **全維持** |
| L2 | 3バリデータ | metadata + test-quality 維持、**phase-gate 緩和** |
| L3 | 4バリデータ | **security のみ** |
| L4 | 3バリデータ | **スキップ** |
| 2-Phase Execution | 必須 | **緩和** |

### 防波堤

`phasegate.config.json` の `quickMode.allowedCategories` で適用条件を明示。条件外の変更には自動拒否する。

## Consequences

- 軽微な変更の開発速度が最大化される
- 品質ゲート緩和の範囲が厳格に定義され、拡大圧力への防波堤となる
- Quick Mode でも L1 全ルールと L2 metadata/test-quality は維持される

## 関連要件

K1（4層防御）

## Alternatives

当時、代替案は明示的に文書化されていない。本節は既存決定を `validate-adr` ゲートで検査可能にするための遡及的正規化（コーパス正規化）に伴い追加された。
