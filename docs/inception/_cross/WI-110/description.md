---
id: WI-110
type: issue
severity: normal
status: tested
affects: [validator-system]
source: internal
---

# WI-110: L1/L2 validator ownership and execution boundary must be corrected

> 起票日: 2026-05-09
> 起票経緯: WI-106 PhaseGate dogfood audit で、`validate --layer L1` が `L2-013` を実行し、`validate --layer L2` では実行されないことを確認した。

## 背景

validator ID が `L2-013` であるにもかかわらず L1 実行に含まれると、ユーザーはどの layer の責務として修正すべきか判断できない。layer ごとの gating policy や CI routing も不明確になる。

これは検出器追加ではなく、既存 validator の所有 layer と実行 layer の不整合である。

## 本 WI でやること

1. `L2-013` の責務を確認し、L1 / L2 のどちらに属すべきか決定する。
2. L2 に属すべきなら L2 実行経路へ移す。
3. L1 に属すべきなら validator ID / docs / catalog を L1 として整合させる。
4. `validate --layer L1` / `validate --layer L2` の実行結果が ID prefix と一致するようにする。

## 受け入れ基準

- [x] `validate --layer L1` に `L2-*` validator が混入しない
- [x] `validate --layer L2` に属すべき validator が L2 で実行される
- [x] validator catalog / error docs / CLI 出力の layer 表記が一致する
- [x] L1/L2 境界の regression test が追加されている

## 関連

- [WI-106 dogfood audit](../WI-106/phasegate_dogfood_audit.md)
- WI-111: CLI command E2E coverage validator needs reliable command-to-test mapping
