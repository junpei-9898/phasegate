---
id: WI-107
type: issue
severity: high
status: tested
affects: [validator-system]
source: internal
---

# WI-107: CI/L4 execution semantics must be unified

> 起票日: 2026-05-09
> 起票経緯: WI-106 PhaseGate dogfood audit で、L4 warning / failure / disabled layer / `all` の扱いがコマンド間で一貫していないことを確認した。

## 背景

L4 は default off の scheduled layer だが、現在の実行結果は以下のように契約が揺れている。

- `validate --layer L4` は drift warning を出して総合 PASS になる。
- `validate --layer L4 --fail-on-warning` は同じ warning を FAIL にする。
- `phasegate:detect-drift --json` は同じ drift set を failure として扱う。
- `validate --layer all --fail-on-warning` は L4 disabled のため PASS になる。

これは新機能ではなく、既存の L4 / CI 契約が曖昧なまま実装に分散している問題である。

## 本 WI でやること

1. `validate --layer L4`、`validate --layer all`、`phasegate:detect-drift`、CI 経路で L4 を advisory / gating のどちらとして扱うかを明文化する。
2. `failOnWarning` config と `--fail-on-warning` / `--no-fail-on-warning` の優先順位を、全 L4 実行経路で統一する。
3. disabled layer が `all` に含まれる場合の表示・exit code・skip 表現を統一する。
4. README / guide / product docs の layer matrix を実装と一致させる。

## 受け入れ基準

- [x] L4 warning が exit code に反映される条件が 1 つの仕様として文書化されている
- [x] `validate --layer L4` と `phasegate:detect-drift` が同じ L4 policy に従う
- [x] `validate --layer all` が disabled L4 を skip する場合、その事実が出力に明示される
- [x] `--fail-on-warning` の CLI override が config より優先されることをテストで保証する
- [x] README / `docs/guide/layer-model.md` / `docs/guide/cli-reference.md` の L4 説明が実装と一致する

## 関連

- [WI-106 dogfood audit](../WI-106/phasegate_dogfood_audit.md)
- WI-108: `phasegate:ci-check` must match its documented L2-L4 contract
- WI-112: `phasegate:status` must report trustworthy, non-stale state
- WI-114: L4 drift detector output must become actionable at repository scale
