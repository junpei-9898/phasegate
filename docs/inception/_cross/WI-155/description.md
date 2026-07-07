---
id: WI-155
type: issue
severity: normal
status: tested
affects: [documentation]
source: internal
---

# WI-155: Product Traceability Reflection Cleanup

> 起票日: 2026-05-12
> 起票経緯: product docs の `@work-item-id` 反映粒度を改善し、legacy annotation 依存を減らすため。

## スコープ

- `WI-037..050`: legacy `@story-id Hxx-xx` 中心の箇所。
- `WI-072`: `CommitMessage.workItemId` / `Work-Item: WI-XXX` の `logical_design.md` 反映。
- `WI-097..103`: agent-integration の product reflection 粒度。

## 主要成果物

- `docs/product/construction/ci-governance/*`
- `docs/product/construction/harness-api/*`
- `docs/product/construction/harness-error/*`
- `docs/product/construction/nyquist-validation/*`
- `docs/product/construction/skill-quality/logical_design.md`
- `docs/product/construction/agent-integration/*`

## 受け入れ基準

- [x] 新規追記は `@work-item-id` を使う。
- [x] legacy ID は履歴として残してよいが、現行 WI との対応が機械的に追える。
- [x] product docs に反映するだけで、ソース変更は原則しない。

## 依存

`WI-149` の HarnessError product docs 修正と重複しやすい。`WI-149` で P0 を先に直し、こちらは残りの体系化に限定する。

## 対応結果

- ADR-013 と product construction docs に Work Item ID 優先の reflection 方針を追記した。
- ci-governance / harness-api / harness-error / nyquist-validation / skill-quality の product docs に `@work-item-id WI-155` 付きで legacy annotation と現行 WI の責務境界を反映した。
- ソース変更は行わず、product/public docs の整理に限定した。
