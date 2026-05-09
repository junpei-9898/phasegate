---
id: WI-114
type: issue
severity: normal
status: implemented
affects: [traceability-model, validator-system]
source: internal
---

# WI-114: L4 drift detector output must become actionable at repository scale

> 起票日: 2026-05-09
> 起票経緯: WI-106 PhaseGate dogfood audit で、`phasegate:detect-drift --json` が 1,975 件の drift item を返し、運用上の次アクションを選びにくいことを確認した。

## 背景

drift detector は動作しているが、repository scale で raw drift item が大量に出ると、maintainer はどれから直すべきか判断できない。L4 を scheduled validator として運用するには、baseline、severity threshold、pointer strategy、report compaction のいずれかが必要である。

これは drift 検出能力の新規追加ではなく、既存 L4 signal を運用可能な粒度にする問題である。

## 本 WI でやること

1. 1,975 件の drift item を分類し、noise / true drift / missing pointer / design granularity mismatch を分ける。
2. WI-107 の L4 policy に合わせて、advisory report と gating failure の閾値を決める。
3. report compaction、baseline、severity、pointer 補助のどれを採用するか決める。
4. 大量 drift がある場合でも、次に直すべき concrete action が分かる出力にする。

## 受け入れ基準

- [x] drift report が category / severity / next action を含む
- [x] repository scale の drift output が raw 1,975 件の羅列だけにならない
- [x] baseline または threshold の扱いが docs と tests に残る
- [x] L4 advisory / gating の扱いが WI-107 の policy と一致する

## 実装メモ

- 今回は baseline file ではなく report compaction + advisory threshold を採用する。
- `phasegate:detect-drift` は raw drift 全件を gate failure にせず、sampleLimit 件の `drifts[]`、全件集計の `categorySummaries`、上位 `actionPlan`、`summary.warnings` で次アクションを返す。
- L4 の gating threshold は WI-107 と同じく「明示的 L4 fail-on-warning 時のみ失敗」であり、通常の `phasegate:detect-drift` は exit 0 の advisory report とする。

## 関連

- [WI-106 dogfood audit](../WI-106/phasegate_dogfood_audit.md)
- WI-107: CI/L4 execution semantics must be unified
