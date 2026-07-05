---
adr_id: "012"
title: "2-Phase Execution（人間承認ゲート）"
status: Accepted
date: 2026-03-24
---

# 2-Phase Execution（人間承認ゲート）

## Context

AI エージェントは設計段階で誤った判断を行う可能性がある。設計文書が誤っていれば、その後の実装・テストも全て誤った方向に進む。設計のミスは実装のミスより修正コストが桁違いに高い。

## Decision

全ての設計スキル（domain-designer, logical-designer 等）の出力に **人間の承認を必須** とする 2-Phase Execution パターンを採用する。

### Phase 構成

| Phase | 実行者 | 出力 | 人間承認 |
|-------|--------|------|---------|
| Phase 1（計画） | AI | `inception/` 配下の `*_plan.md` | **必須** |
| Phase 2（実行） | AI | `product/construction/` 配下の設計文書 | Phase 1 承認後に自動実行 |

### Plan 文書の必須生成（K15）

Planning Mode が interactive であれ embedded-qa であれ、全フェーズの Phase 1 は `inception/` 配下に `*_plan.md` を生成して完了する。plan 文書なしの Phase 2 移行は不可。

### QA セクション

設計判断の根拠を `*_plan.md` 内の QA セクションに構造化して保持する。セッションが失われても設計意図が残る。

## Consequences

- AI の設計判断に人間の承認ゲートが挿入される
- Phase Gate バリデータ（L2-001）が plan 文書の存在を機械的に検証
- 設計判断の根拠が QA セクションとしてトレーサブルに保持される

## 関連要件

K6（2-Phase Execution）、K15（Plan文書の必須生成）

## Alternatives

当時、代替案は明示的に文書化されていない。本節は既存決定を `validate-adr` ゲートで検査可能にするための遡及的正規化（コーパス正規化）に伴い追加された。
