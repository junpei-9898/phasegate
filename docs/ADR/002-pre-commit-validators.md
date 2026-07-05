---
adr_id: "002"
title: "L2 — Pre-commit バリデータによる設計-実装順序の強制"
status: Accepted
date: 2026-03-24
---

# L2 — Pre-commit バリデータによる設計-実装順序の強制

## Context

AIエージェントは設計文書を無視して直接コードを書くことがある。設計→実装の順序を守らないと、設計意図とコードが乖離し、トレーサビリティが崩壊する。

## Decision

L2（Pre-commit）で以下のバリデータにより設計-実装の順序、メタデータ、テスト品質、CLI E2E、WI status、公開 contract traceability を機械的に強制または報告する。初期ADRの3バリデータ記述は履歴であり、現行 catalog は validator-system registry を正とする。<!-- @work-item-id WI-168 -->

| バリデータ | コード | 検出対象 |
|-----------|--------|---------|
| phase-gate | L2-001 | 設計文書なしの実装コード変更を拒否 |
| metadata | L2-002 | @unit/@layer/@US-XXX メタデータの完全性検証 |
| test-quality | L2-003 | AAA パターン、actual 命名、日本語テスト名の検証 |
| cli-e2e | L2-013 | public CLI entrypoint の基本 E2E 契約 |
| wi-status | L2-014 | WI status と acceptance criteria の陳腐化検出 |
| contract-traceability | L2-015 | public contract / boundary / observation の traceability coverage |

### Phase Gate の3層検証

1. Level 間の依存違反（Level 2 の前提なしに Level 3 開始）
2. Level 内の上流設計なしの下流設計生成
3. 設計文書・plan 文書なしの実装コード変更

## Consequences

- 設計文書なしのコード変更が物理的に不可能になる
- `@work-item-id WI-XXX` と legacy annotation の対応によりトレーサビリティが機械的に保証される
- テスト品質ルール（AAA, actual 命名）が全テストに強制される

## 関連要件

K2（Phase Gate）、K3.5（メタデータ）、K4（テスト品質ルール）、K14（Phase Dependency Model）

## Alternatives

当時、代替案は明示的に文書化されていない。本節は既存決定を `validate-adr` ゲートで検査可能にするための遡及的正規化（コーパス正規化）に伴い追加された。
