# ADR-004: L4 — Scheduled バリデータによる設計-実装乖離の定期検出

## Status

Accepted

## Context

日常の開発では L1-L3 のゲートで品質が維持されるが、時間の経過とともに設計文書とコードの乖離（ドリフト）、文書間の不整合、未使用コードの蓄積が発生する。これらは即座に検出する必要はないが、放置すると技術的負債として蓄積する。

## Decision

L4（Scheduled）で以下の3バリデータを週次で実行する。

| バリデータ | コード | 検出対象 |
|-----------|--------|---------|
| drift-detect | L4-001 | 設計にあるがコードにない / コードにあるが設計にない双方向乖離 |
| consistency-check | L4-002 | 文書間のレイヤー整合性の破綻 |
| dead-code | L4-003 | 未使用エクスポート、到達不能コード |

### 技術的実装

- **drift-detect**: `DriftDetectionService` が設計文書のエレメント（Markdown 解析）とコードのエクスポート（TypeScript Compiler API）を比較
- **consistency-check**: `ConsistencyCheckService` が設計文書間の @layer アノテーション整合性を検証
- **dead-code**: `DeadCodeDetectionService` が import グラフ解析で未参照エクスポートを検出

## Consequences

- 設計-実装の乖離が週次で自動検出される
- 未使用コードの蓄積が防止される
- strict プリセットでのみ L4 が有効（standard/minimal ではスキップ）

## 関連要件

K1（4層防御）、K11（Drift Detection）、K12（Consistency Checker）
