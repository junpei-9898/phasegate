---
id: WI-108
type: issue
severity: high
status: tested
affects: [validator-system]
source: internal
---

# WI-108: `phasegate:ci-check` must match its documented L2-L4 contract

> 起票日: 2026-05-09
> 起票経緯: WI-106 PhaseGate dogfood audit で、README / CLI reference の契約と実際の `phasegate:ci-check --json` の実行レイヤーが一致しないことを確認した。

## 背景

README と `docs/guide/cli-reference.md` は `ci-check` を L2-L4 の full CI check と説明している。一方、dogfood 実行では `phasegate:ci-check --json` が L3 validators のみを実行していた。

これは新仕様追加ではなく、公開済み CLI 契約と実装の不一致である。

## 本 WI でやること

1. `phasegate:ci-check` の正しい責務を L2-L4 full check として再確認する。
2. WI-107 で確定する L4 policy に従って、`ci-check` の実行レイヤーと skip / fail 表現を修正する。
3. `ci-check --json` の出力に、実行・skip された layer が読み取れる情報を含める。
4. 実装を狭める判断をする場合は、README / CLI reference / product docs の契約を同時に狭める。

## 受け入れ基準

- [x] `phasegate:ci-check` の実行範囲が README / CLI reference と一致する
- [x] L2 / L3 / L4 の実行または skip が JSON 出力から判別できる
- [x] disabled L4 の扱いが WI-107 の layer policy と一致する
- [x] L3 のみを実行して PASS する状態が、L2-L4 full check として報告されない
- [x] `phasegate:ci-check --json` の統合テストが追加または更新されている

## 関連

- [WI-106 dogfood audit](../WI-106/phasegate_dogfood_audit.md)
- WI-107: CI/L4 execution semantics must be unified
