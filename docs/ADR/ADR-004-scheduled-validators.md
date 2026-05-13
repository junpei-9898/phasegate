# ADR-004: L4 — Scheduled バリデータによる設計-実装乖離の定期検出

## Status

Accepted

## Context

日常の開発では L1-L3 のゲートで品質が維持されるが、時間の経過とともに設計文書とコードの乖離（ドリフト）、文書間の不整合、未使用コードの蓄積が発生する。これらは即座に検出する必要はないが、放置すると技術的負債として蓄積する。

## Decision

L4（Scheduled）で以下のバリデータを週次または明示実行で扱う。初期ADRの3バリデータ記述は履歴であり、現行 catalog は validator-system registry と `docs/guide/layer-model.md` を正とする。<!-- @work-item-id WI-168 -->

| バリデータ | コード | 検出対象 |
|-----------|--------|---------|
| drift-detect | L4-001 | 設計にあるがコードにない / コードにあるが設計にない双方向乖離 |
| consistency-check | L4-002 | 文書間のレイヤー整合性の破綻 |
| dead-code | L4-003 | 未使用エクスポート、到達不能コード |
| doc-freshness | L4-004 | 設計文書の freshness threshold 超過 |
| pointer-validation | L4-005 | 設計文書 pointer の owner/type/source/severity/nextAction 付き検証 |

### 技術的実装

- **drift-detect**: `DriftDetectionService` が設計文書のエレメント（Markdown 解析）とコードのエクスポート（TypeScript Compiler API）を比較
- **consistency-check**: `ConsistencyCheckService` が設計文書間の @layer アノテーション整合性を検証
- **dead-code**: `DeadCodeDetectionService` が import グラフ解析で未参照エクスポートを検出

## Consequences

- 設計-実装の乖離が週次で自動検出される
- 未使用コードの蓄積が防止される
- L4 は default-off の scheduled/advisory 層として扱い、strict または明示 `validate --layer L4` で実行できる。fail-on-warning policy がない限り warning-only findings は gate failure へ昇格しない。

## 関連要件

K1（4層防御）、K11（Drift Detection）、K12（Consistency Checker）
